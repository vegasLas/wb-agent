/**
 * User Tracking Service - Phase 2: Ban & Error Handling
 * Tracks which users are currently being processed and maintains blacklist.
 */

import type { ISharedUserTrackingService } from '@/services/monitoring/shared/interfaces/sharedInterfaces';

// Constants
const USER_TRACKING_CLEAR_INTERVAL_MS = 5 * 1000; // 5 seconds
const DEFAULT_BLACKLIST_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export class SharedUserTrackingService implements ISharedUserTrackingService {
  private readonly runningUserIds = new Set<number>();
  private readonly blacklistedUsers = new Map<number, number>(); // userId -> expiration timestamp
  private clearTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startClearTimer();
  }

  /**
   * Starts the timer to periodically clear expired users
   */
  private startClearTimer(): void {
    if (this.clearTimer) {
      clearInterval(this.clearTimer);
    }

    this.clearTimer = setInterval(() => {
      this.clearExpiredUsers();
    }, USER_TRACKING_CLEAR_INTERVAL_MS);
  }

  /**
   * Clears expired blacklisted users from memory
   */
  clearExpiredUsers(): void {
    const now = Date.now();

    // Clear expired blacklisted users
    for (const [userId, expiration] of this.blacklistedUsers.entries()) {
      if (now >= expiration) {
        this.blacklistedUsers.delete(userId);
      }
    }
  }

  /**
   * Checks if user is currently running
   */
  isUserRunning(userId: number): boolean {
    return this.runningUserIds.has(userId);
  }

  /**
   * Tracks multiple users as running
   */
  trackUsersAsRunning(userIds: number[]): void {
    userIds.forEach((userId) => {
      this.runningUserIds.add(userId);
    });
  }

  /**
   * Tracks single user as running
   */
  trackUserAsRunning(userId: number): void {
    this.runningUserIds.add(userId);
  }

  /**
   * Removes multiple users from running tracking
   */
  removeUsersFromRunning(userIds: number[]): void {
    userIds.forEach((userId) => {
      this.runningUserIds.delete(userId);
    });
  }

  /**
   * Removes single user from running tracking
   */
  removeUserFromRunning(userId: number): void {
    this.runningUserIds.delete(userId);
  }

  /**
   * Checks if a user is currently blacklisted
   */
  isUserBlacklisted(userId: number): boolean {
    const expiration = this.blacklistedUsers.get(userId);

    if (!expiration) {
      return false;
    }

    if (Date.now() >= expiration) {
      this.blacklistedUsers.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Adds a user to the blacklist for specified duration
   */
  addUserToBlacklist(
    userId: number,
    duration: number = DEFAULT_BLACKLIST_DURATION_MS,
  ): void {
    const expiration = Date.now() + duration;
    this.blacklistedUsers.set(userId, expiration);

    const durationMinutes = duration / 60000;
    console.log(
      `🚫 BLACKLISTED USER: ${userId} - Duration: ${durationMinutes} minutes`,
    );
  }

  /**
   * Removes user from blacklist
   */
  removeUserFromBlacklist(userId: number): void {
    this.blacklistedUsers.delete(userId);
    console.log(`✅ REMOVED USER FROM BLACKLIST: ${userId}`);
  }

  /**
   * Gets all currently running user IDs
   */
  getRunningUserIds(): Set<number> {
    return new Set(this.runningUserIds);
  }

  /**
   * Gets all currently blacklisted user IDs
   */
  getBlacklistedUserIds(): Set<number> {
    this.clearExpiredUsers(); // Clean up first
    return new Set(this.blacklistedUsers.keys());
  }

  /**
   * Gets count of running users
   */
  getRunningUserCount(): number {
    return this.runningUserIds.size;
  }

  /**
   * Gets count of blacklisted users
   */
  getBlacklistedUserCount(): number {
    this.clearExpiredUsers(); // Clean up first
    return this.blacklistedUsers.size;
  }

  /**
   * Clears all running users (useful for cleanup/reset)
   */
  clearAllRunningUsers(): void {
    this.runningUserIds.clear();
    console.log('🧹 Cleared all running users');
  }

  /**
   * Clears all blacklisted users (useful for cleanup/reset)
   */
  clearAllBlacklistedUsers(): void {
    this.blacklistedUsers.clear();
    console.log('🧹 Cleared all blacklisted users');
  }

  /**
   * Gets remaining blacklist time for a user in milliseconds
   */
  getRemainingBlacklistTime(userId: number): number {
    const expiration = this.blacklistedUsers.get(userId);
    if (!expiration) return 0;

    const remaining = expiration - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Gets remaining blacklist time for a user in human readable format
   */
  getRemainingBlacklistTimeFormatted(userId: number): string {
    const remainingMs = this.getRemainingBlacklistTime(userId);
    if (remainingMs === 0) return 'Not blacklisted';

    const minutes = Math.ceil(remainingMs / 60000);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  /**
   * Logs current state for debugging
   */
  logCurrentState(): void {
    console.log(
      `👥 Running users: ${this.getRunningUserCount()} [${Array.from(this.runningUserIds).join(', ')}]`,
    );
    console.log(
      `🚫 Blacklisted users: ${this.getBlacklistedUserCount()} [${Array.from(this.getBlacklistedUserIds()).join(', ')}]`,
    );
  }

  /**
   * Cleanup method to be called when service is destroyed
   */
  cleanup(): void {
    if (this.clearTimer) {
      clearInterval(this.clearTimer);
      this.clearTimer = null;
    }
    this.clearAllRunningUsers();
    this.clearAllBlacklistedUsers();
  }
}

export const sharedUserTrackingService = new SharedUserTrackingService();
