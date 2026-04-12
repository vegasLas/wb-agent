import type { Supplier } from '../../types';

export interface Account {
  id: string;
  phoneWb?: string;
  selectedSupplierId?: string;
  suppliers: Supplier[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountsResponse {
  success: boolean;
  accounts: Account[];
}

export interface AccountResponse {
  success: boolean;
  account: Account;
}

export interface UpdateSupplierResponse {
  success: boolean;
  accountId: string;
  supplierId: string;
}

export interface SyncSuppliersResponse {
  success: boolean;
  message?: string;
  suppliers: Supplier[];
}
