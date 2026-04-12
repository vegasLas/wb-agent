import type { User as TypesUser, Account as TypesAccount } from '@/types';

// Store-specific interfaces aligned with types but preserving backward compatibility
export type User = TypesUser

// Payment type is re-exported from @/types via payments/types.ts

// Store Account extends TypesAccount with backward compatible properties
export interface Account extends TypesAccount {
  wbCookies?: boolean;
}

export interface Supplier {
  supplierId: string;
  supplierName: string;
}
