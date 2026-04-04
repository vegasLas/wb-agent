import { encrypt, decrypt } from './encryption';
import { prisma } from '../config/database';

export interface LocalStorageData {
  [key: string]: string;
}

/**
 * Filters localStorage to only include authentication-relevant keys
 * Matches patterns: 'access-token', 'successful_login'
 */
function extractRelevantStorage(storage: LocalStorageData): LocalStorageData {
  const relevant: LocalStorageData = {};
  const relevantKeyPatterns = ['access-token', 'successful_login'];

  Object.keys(storage).forEach((key) => {
    relevantKeyPatterns.forEach((pattern) => {
      if (key.includes(pattern)) {
        relevant[key] = storage[key];
      }
    });
  });

  return relevant;
}

/**
 * Encodes localStorage data by filtering, stringifying, and encrypting
 * @param storage - LocalStorage data object
 * @returns Encrypted localStorage string
 */
export function encodeLocalStorage(storage: LocalStorageData): string {
  const relevantStorage = extractRelevantStorage(storage);
  const storageString = JSON.stringify(relevantStorage);
  return encrypt(storageString);
}

/**
 * Decodes encrypted localStorage string back to object
 * @param encodedStorage - Encrypted localStorage string
 * @returns LocalStorage data object or empty object on error
 */
export function decodeLocalStorage(encodedStorage: string): LocalStorageData {
  try {
    const decrypted = decrypt(encodedStorage);
    const storage = JSON.parse(decrypted) as LocalStorageData;

    if (typeof storage !== 'object' || storage === null) {
      throw new Error('Invalid localStorage structure');
    }

    return storage;
  } catch (error) {
    console.error('Error decoding localStorage:', error);
    return {};
  }
}

/**
 * Saves localStorage to a specific account
 * @param storage - LocalStorage data to save
 * @param accountId - Account ID
 */
export async function saveLocalStorageToAccount(
  storage: LocalStorageData,
  accountId: string,
): Promise<void> {
  const encodedStorage = encodeLocalStorage(storage);

  await prisma.account.update({
    where: { id: accountId },
    data: {
      wbLocalStorage: encodedStorage,
      updatedAt: new Date(),
    },
  });
}

/**
 * Gets localStorage from a specific account
 * @param accountId - Account ID
 * @returns LocalStorage data object or empty object
 */
export async function getLocalStorageFromAccount(
  accountId: string,
): Promise<LocalStorageData> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account?.wbLocalStorage) {
    return {};
  }

  return decodeLocalStorage(account.wbLocalStorage);
}

/**
 * Merges new localStorage data with existing account data
 * @param newStorage - New localStorage data to merge
 * @param accountId - Account ID
 */
export async function mergeLocalStorageToAccount(
  newStorage: LocalStorageData,
  accountId: string,
): Promise<void> {
  const relevantStorage = extractRelevantStorage(newStorage);

  // Get existing storage
  const existingStorage = await getLocalStorageFromAccount(accountId);

  // Merge: update or add new storage keys
  const mergedStorage = { ...existingStorage, ...relevantStorage };

  // Save merged result
  const encodedStorage = encodeLocalStorage(mergedStorage);

  await prisma.account.update({
    where: { id: accountId },
    data: {
      wbLocalStorage: encodedStorage,
      updatedAt: new Date(),
    },
  });
}
