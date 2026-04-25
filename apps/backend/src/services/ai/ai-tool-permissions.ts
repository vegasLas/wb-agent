import type { Tool } from 'ai';
import type { Permission } from '@prisma/client';

const TOOL_PERMISSION_MAP: Record<string, Permission[]> = {
  autobookingTools: ['SUPPLIES'],
  triggerTools: [],
  supplierTools: ['SUPPLIES'],
  externalTools: ['SUPPLIES'],
  reportsTools: ['REPORTS'],
  advertsTools: ['ADVERTS'],
  promotionsTools: ['PROMOTIONS'],
  mpstatsTools: [],
  contentCardsTools: ['SUPPLIES'],
  userContextTools: [],
};

export function filterToolsByPermissions(
  allTools: Record<string, Tool>,
  toolGroupName: string,
  permissions: Permission[],
): Record<string, Tool> {
  const required = TOOL_PERMISSION_MAP[toolGroupName];
  if (!required || required.length === 0) {
    return allTools;
  }
  const hasPermission = required.every((p) => permissions.includes(p));
  if (!hasPermission) {
    return {};
  }
  return allTools;
}
