import { prisma } from '../config/database';

/**
 * Checks if a new user should receive the welcome bonus
 * @param userId - The user ID
 * @param supplierId - The supplier ID from cookies
 * @returns Promise<boolean> - Whether bonus should be added
 */
export async function checkIfShouldAddBonus(
  userId: number,
  supplierId: string,
): Promise<boolean> {
  // Check if user already has a welcome bonus (one-time per user)
  const existingBonus = await prisma.bonus.findFirst({
    where: {
      userId,
      bonusType: 'NEW_USER_WELCOME',
    },
  });

  if (existingBonus) {
    return false; // User already received welcome bonus
  }

  // Check if this supplier has been seen before (globally)
  const existingSupplier = await prisma.userSupplierHistory.findUnique({
    where: {
      supplierId,
    },
  });

  if (existingSupplier) {
    return false; // This supplier has been used before, not eligible for welcome bonus
  }

  // Record this supplier for future checks
  await prisma.userSupplierHistory.create({
    data: {
      supplierId,
    },
  });

  // Create the bonus record (one-time per user)
  await prisma.bonus.create({
    data: {
      userId,
      bonusType: 'NEW_USER_WELCOME',
      bonusValue: 5,
      description: 'Welcome bonus for new users',
      isApplied: true,
      appliedAt: new Date(),
    },
  });

  return true; // Bonus should be added
}
