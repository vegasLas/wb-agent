// =============================================================================
// Base TypeScript Types for WB Agent Frontend
// =============================================================================

// -----------------------------------------------------------------------------
// View Types
// -----------------------------------------------------------------------------
export type ViewType =
  | 'triggers-main'
  | 'triggers-form'
  | 'autobookings-form'
  | 'autobookings-update'
  | 'autobookings-main'
  | 'reschedules-main'
  | 'reschedules-form'
  | 'reschedules-update'
  | 'store'
  | 'account'
  | 'store-subscription'
  | 'store-bookings'
  | 'report'
  | 'auth';

// -----------------------------------------------------------------------------
// User & Authentication Types
// -----------------------------------------------------------------------------
export interface User {
  id: number;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// -----------------------------------------------------------------------------
// Account Types
// -----------------------------------------------------------------------------
export interface Account {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountWithSuppliers extends Account {
  suppliers: Supplier[];
}

// -----------------------------------------------------------------------------
// Supplier Types
// -----------------------------------------------------------------------------
export interface Supplier {
  id: number;
  name: string;
  accountId: number;
  isActive: boolean;
  apiKey?: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Autobooking Types
// -----------------------------------------------------------------------------
export interface Autobooking {
  id: number;
  supplierId: number;
  warehouseId: number;
  boxTypeId: number;
  coefficient: number;
  dateFrom: string;
  dateTo: string;
  status: AutobookingStatus;
  createdAt: string;
  updatedAt: string;
}

export type AutobookingStatus = 'active' | 'paused' | 'completed' | 'failed';

export interface AutobookingCreateData {
  supplierId: number;
  warehouseId: number;
  boxTypeId: number;
  coefficient: number;
  dateFrom: string;
  dateTo: string;
}

// -----------------------------------------------------------------------------
// Warehouse Types
// -----------------------------------------------------------------------------
export interface Warehouse {
  id: number;
  name: string;
  address?: string;
  isActive: boolean;
}

export interface WarehouseWithCoefficient extends Warehouse {
  coefficient: number;
  date: string;
}

// -----------------------------------------------------------------------------
// Coefficient Types
// -----------------------------------------------------------------------------
export interface Coefficient {
  warehouseId: number;
  boxTypeId: number;
  coefficient: number;
  date: string;
}

// -----------------------------------------------------------------------------
// Trigger Types
// -----------------------------------------------------------------------------
export interface Trigger {
  id: number;
  supplierId: number;
  warehouseIds: number[];
  boxTypeIds: number[];
  coefficientThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TriggerCreateData {
  supplierId: number;
  warehouseIds: number[];
  boxTypeIds: number[];
  coefficientThreshold: number;
}

// -----------------------------------------------------------------------------
// Reschedule Types
// -----------------------------------------------------------------------------
export interface Reschedule {
  id: number;
  supplierId: number;
  supplyId: string;
  oldDate: string;
  newDate: string;
  status: RescheduleStatus;
  createdAt: string;
  updatedAt: string;
}

export type RescheduleStatus = 'pending' | 'completed' | 'failed';

export interface RescheduleCreateData {
  supplierId: number;
  supplyId: string;
  newDate: string;
}

// -----------------------------------------------------------------------------
// Supply Types
// -----------------------------------------------------------------------------
export interface Supply {
  id: string;
  supplierId: number;
  warehouseId: number;
  date: string;
  status: string;
  goods: SupplyGood[];
}

export interface SupplyGood {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

// -----------------------------------------------------------------------------
// Draft Types
// -----------------------------------------------------------------------------
export interface Draft {
  id: string;
  supplierId: number;
  name: string;
  goods: DraftGood[];
  createdAt: string;
}

export interface DraftGood {
  id: string;
  name: string;
  quantity: number;
}

// -----------------------------------------------------------------------------
// Report Types
// -----------------------------------------------------------------------------
export interface Report {
  id: number;
  supplierId: number;
  periodFrom: string;
  periodTo: string;
  data: ReportData;
  createdAt: string;
}

export interface ReportData {
  totalSupplies: number;
  totalGoods: number;
  warehouseDistribution: WarehouseDistribution[];
}

export interface WarehouseDistribution {
  warehouseId: number;
  warehouseName: string;
  count: number;
  percentage: number;
}

// -----------------------------------------------------------------------------
// Payment Types
// -----------------------------------------------------------------------------
export interface Subscription {
  id: number;
  userId: number;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt: string;
  createdAt: string;
}

export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface Tariff {
  id: string;
  name: string;
  price: number;
  period: 'month' | 'year';
  features: string[];
}

// -----------------------------------------------------------------------------
// UI Types
// -----------------------------------------------------------------------------
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface ModalState {
  isOpen: boolean;
  data?: unknown;
}

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  errors?: Record<string, string[]>;
}

// -----------------------------------------------------------------------------
// Telegram WebApp Types
// -----------------------------------------------------------------------------
export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

export interface TelegramWebAppInitData {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: unknown;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date: number;
  hash: string;
}
