/**
 * Feedback Goods Group Service
 * Manages groups of goods that share rejected feedback context.
 */

import { prisma } from '@/config/database';
import { createLogger } from '@/utils/logger';
import { ApiError } from '@/utils/errors';
import type { FeedbackGoodsGroup } from '@prisma/client';

const logger = createLogger('FeedbackGoodsGroup');

/** Prisma transaction client (structurally compatible with model accessors) */
type PrismaTx = typeof prisma;

export class FeedbackGoodsGroupService {
  /**
   * Get all groups for a user + supplier.
   */
  async getGroups(userId: number, supplierId: string): Promise<FeedbackGoodsGroup[]> {
    try {
      return await prisma.feedbackGoodsGroup.findMany({
        where: { userId, supplierId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error(`Failed to fetch groups for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all nmIds in the same group as the given nmId (excluding itself).
   */
  async getGroupNmIds(userId: number, supplierId: string, nmId: number): Promise<number[]> {
    try {
      const groups = await prisma.feedbackGoodsGroup.findMany({
        where: {
          userId,
          supplierId,
          nmIds: { has: nmId },
        },
      });

      const related = new Set<number>();
      for (const group of groups) {
        for (const id of group.nmIds) {
          if (id !== nmId) {
            related.add(id);
          }
        }
      }

      return Array.from(related);
    } catch (error) {
      logger.error(`Failed to get group nmIds for user ${userId}, nmId ${nmId}:`, error);
      return [];
    }
  }

  /**
   * Create a new group. Validates that no nmId is already in another group.
   */
  async createGroup(
    userId: number,
    supplierId: string,
    nmIds: number[],
  ): Promise<FeedbackGoodsGroup> {
    if (nmIds.length < 2) {
      throw ApiError.badRequest('Group must contain at least 2 goods');
    }

    const uniqueNmIds = [...new Set(nmIds)];
    if (uniqueNmIds.length < 2) {
      throw ApiError.badRequest('Group must contain at least 2 different goods');
    }

    await this._ensureNoConflictingGroups(userId, supplierId, uniqueNmIds);

    try {
      const group = await prisma.feedbackGoodsGroup.create({
        data: {
          userId,
          supplierId,
          nmIds: uniqueNmIds,
        },
      });
      logger.info(`Created group ${group.id} for user ${userId} with nmIds: [${uniqueNmIds.join(', ')}]`);
      return group;
    } catch (error) {
      logger.error(`Failed to create group for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update a group's nmIds. Validates uniqueness.
   */
  async updateGroup(
    id: string,
    userId: number,
    nmIds: number[],
  ): Promise<FeedbackGoodsGroup> {
    if (nmIds.length < 2) {
      throw ApiError.badRequest('Group must contain at least 2 goods');
    }

    const uniqueNmIds = [...new Set(nmIds)];
    if (uniqueNmIds.length < 2) {
      throw ApiError.badRequest('Group must contain at least 2 different goods');
    }

    // Ensure the group exists and belongs to the user
    const existing = await prisma.feedbackGoodsGroup.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw ApiError.notFound('Group not found');
    }

    // Check for conflicts, excluding this group's current nmIds
    const otherConflicts = await this._findConflictingGroups(userId, existing.supplierId, uniqueNmIds);
    const conflictsExcludingSelf = otherConflicts.filter((g) => g.id !== id);
    if (conflictsExcludingSelf.length > 0) {
      const conflictingNmIds = conflictsExcludingSelf.flatMap((g) => g.nmIds);
      const intersection = uniqueNmIds.filter((id) => conflictingNmIds.includes(id));
      throw ApiError.conflict(
        `Some goods are already in other groups: [${intersection.join(', ')}]`,
      );
    }

    try {
      const [group] = await prisma.$transaction([
        prisma.feedbackGoodsGroup.update({
          where: { id },
          data: { nmIds: uniqueNmIds },
        }),
      ]);
      logger.info(`Updated group ${id} for user ${userId} with nmIds: [${uniqueNmIds.join(', ')}]`);
      return group;
    } catch (error) {
      logger.error(`Failed to update group ${id} for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a group.
   */
  async deleteGroup(id: string, userId: number, supplierId: string): Promise<void> {
    const result = await prisma.feedbackGoodsGroup.deleteMany({
      where: { id, userId, supplierId },
    });

    if (result.count === 0) {
      throw ApiError.notFound('Group not found');
    }

    logger.info(`Deleted group ${id} for user ${userId}`);
  }

  /**
   * Remove a single nmId from a group.
   * If the group has < 2 items after removal, the entire group is deleted.
   */
  async removeNmIdFromGroup(
    id: string,
    userId: number,
    supplierId: string,
    nmId: number,
  ): Promise<FeedbackGoodsGroup | void> {
    const group = await prisma.feedbackGoodsGroup.findFirst({
      where: { id, userId, supplierId },
    });

    if (!group) {
      throw ApiError.notFound('Group not found');
    }

    if (!group.nmIds.includes(nmId)) {
      throw ApiError.badRequest('Good is not in this group');
    }

    const newNmIds = group.nmIds.filter((n) => n !== nmId);

    if (newNmIds.length < 2) {
      // Delete the entire group if it would have < 2 members
      await prisma.feedbackGoodsGroup.deleteMany({
        where: { id, userId, supplierId },
      });
      logger.info(`Deleted group ${id} for user ${userId} after removing last members`);
      return;
    }

    const updated = await prisma.feedbackGoodsGroup.update({
      where: { id },
      data: { nmIds: newNmIds },
    });

    logger.info(`Removed nmId ${nmId} from group ${id} for user ${userId}`);
    return updated;
  }

  /**
   * Merge two goods. Adds target to source's group, source to target's group,
   * or creates a new pair if neither has a group.
   */
  async mergeGoods(
    userId: number,
    supplierId: string,
    sourceNmId: number,
    targetNmId: number,
  ): Promise<FeedbackGoodsGroup> {
    if (sourceNmId === targetNmId) {
      throw ApiError.badRequest('Cannot merge a good with itself');
    }

    return await prisma.$transaction(async (tx) => {
      return this._doMerge(tx, userId, supplierId, sourceNmId, targetNmId);
    });
  }

  private async _doMerge(
    tx: PrismaTx,
    userId: number,
    supplierId: string,
    sourceNmId: number,
    targetNmId: number,
  ): Promise<FeedbackGoodsGroup> {
    logger.info(
      `_doMerge start: user=${userId}, source=${sourceNmId}, target=${targetNmId}`,
    );

    // Find target's group
    const targetGroup = await tx.feedbackGoodsGroup.findFirst({
      where: {
        userId,
        supplierId,
        nmIds: { has: targetNmId },
      },
    });
    logger.info(
      `_doMerge targetGroup: ${targetGroup ? `found id=${targetGroup.id}, nmIds=[${targetGroup.nmIds.join(', ')}]` : 'not found'}`,
    );

    if (targetGroup) {
      // Target has a group — add source to target's group
      logger.info(`_doMerge branch: target has group, adding source to target's group`);
      await this._removeNmIdFromGroups(tx, userId, supplierId, sourceNmId);
      await this._cleanupGroups(tx, userId, supplierId);

      const newNmIds = [...new Set([...targetGroup.nmIds, sourceNmId])];
      logger.info(`_doMerge updating targetGroup ${targetGroup.id} with nmIds=[${newNmIds.join(', ')}]`);
      const updated = await tx.feedbackGoodsGroup.update({
        where: { id: targetGroup.id },
        data: { nmIds: newNmIds },
      });

      logger.info(
        `Merged source ${sourceNmId} into target group ${targetGroup.id} for user ${userId}`,
      );
      return updated;
    }

    // Target has no group — check if source has a group
    const sourceGroup = await tx.feedbackGoodsGroup.findFirst({
      where: {
        userId,
        supplierId,
        nmIds: { has: sourceNmId },
      },
    });
    logger.info(
      `_doMerge sourceGroup: ${sourceGroup ? `found id=${sourceGroup.id}, nmIds=[${sourceGroup.nmIds.join(', ')}]` : 'not found'}`,
    );

    if (sourceGroup) {
      // Source has a group — add target to source's group
      logger.info(`_doMerge branch: source has group, adding target to source's group`);
      await this._removeNmIdFromGroups(tx, userId, supplierId, targetNmId);
      await this._cleanupGroups(tx, userId, supplierId);

      const newNmIds = [...new Set([...sourceGroup.nmIds, targetNmId])];
      logger.info(`_doMerge updating sourceGroup ${sourceGroup.id} with nmIds=[${newNmIds.join(', ')}]`);
      const updated = await tx.feedbackGoodsGroup.update({
        where: { id: sourceGroup.id },
        data: { nmIds: newNmIds },
      });

      logger.info(
        `Merged target ${targetNmId} into source group ${sourceGroup.id} for user ${userId}`,
      );
      return updated;
    }

    // Neither has a group — create a new pair
    logger.info(`_doMerge branch: neither has group, creating new pair`);
    await this._removeNmIdFromGroups(tx, userId, supplierId, sourceNmId);
    await this._removeNmIdFromGroups(tx, userId, supplierId, targetNmId);
    await this._cleanupGroups(tx, userId, supplierId);

    // Validate pair before creating
    const pair = [sourceNmId, targetNmId];
    await this._ensureNoConflictingGroupsTx(tx, userId, supplierId, pair);

    const group = await tx.feedbackGoodsGroup.create({
      data: {
        userId,
        supplierId,
        nmIds: pair,
      },
    });
    logger.info(
      `Created new pair group ${group.id} for source ${sourceNmId} + target ${targetNmId}, user ${userId}`,
    );
    return group;
  }

  private async _removeNmIdFromGroups(
    tx: PrismaTx,
    userId: number,
    supplierId: string,
    nmId: number,
  ): Promise<void> {
    const groups = await tx.feedbackGoodsGroup.findMany({
      where: {
        userId,
        supplierId,
        nmIds: { has: nmId },
      },
    });

    for (const group of groups) {
      const newNmIds = group.nmIds.filter((id) => id !== nmId);
      await tx.feedbackGoodsGroup.update({
        where: { id: group.id },
        data: { nmIds: newNmIds },
      });
    }
  }

  private async _cleanupGroups(
    tx: PrismaTx,
    userId: number,
    supplierId: string,
  ): Promise<void> {
    // Delete empty groups
    await tx.feedbackGoodsGroup.deleteMany({
      where: {
        userId,
        supplierId,
        nmIds: { isEmpty: true },
      },
    });

    // Also delete groups with only 1 item
    const allGroups = await tx.feedbackGoodsGroup.findMany({
      where: { userId, supplierId },
    });

    const singleItemGroupIds = allGroups
      .filter((g) => g.nmIds.length < 2)
      .map((g) => g.id);

    if (singleItemGroupIds.length > 0) {
      await tx.feedbackGoodsGroup.deleteMany({
        where: {
          id: { in: singleItemGroupIds },
          userId,
          supplierId,
        },
      });
    }
  }

  private async _ensureNoConflictingGroups(
    userId: number,
    supplierId: string,
    nmIds: number[],
  ): Promise<void> {
    const conflicts = await this._findConflictingGroups(userId, supplierId, nmIds);
    if (conflicts.length > 0) {
      const conflictingNmIds = conflicts.flatMap((g) => g.nmIds);
      const intersection = nmIds.filter((id) => conflictingNmIds.includes(id));
      throw ApiError.conflict(
        `Some goods are already in other groups: [${intersection.join(', ')}]`,
      );
    }
  }

  private async _ensureNoConflictingGroupsTx(
    tx: PrismaTx,
    userId: number,
    supplierId: string,
    nmIds: number[],
  ): Promise<void> {
    const conflicts = await tx.feedbackGoodsGroup.findMany({
      where: {
        userId,
        supplierId,
        nmIds: { hasSome: nmIds },
      },
    });
    if (conflicts.length > 0) {
      const conflictingNmIds = conflicts.flatMap((g) => g.nmIds);
      const intersection = nmIds.filter((id) => conflictingNmIds.includes(id));
      throw ApiError.conflict(
        `Some goods are already in other groups: [${intersection.join(', ')}]`,
      );
    }
  }

  private async _findConflictingGroups(
    userId: number,
    supplierId: string,
    nmIds: number[],
  ): Promise<FeedbackGoodsGroup[]> {
    return prisma.feedbackGoodsGroup.findMany({
      where: {
        userId,
        supplierId,
        nmIds: { hasSome: nmIds },
      },
    });
  }
}

export const feedbackGoodsGroupService = new FeedbackGoodsGroupService();
