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
  agreeTerms: boolean;
  subscriptionExpiresAt: string | null;
  autobookingCount: number;
  payments: Payment[];
  selectedAccountId?: string;
  accounts: Account[];
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
  id: string;
  phoneWb: string;
  isActive: boolean;
  suppliers: Supplier[];
  selectedSupplierId: string | null;
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
  supplierId: string;
  supplierName: string;
}

export interface SupplierInfo {
  id: string;
  name: string;
  apiKey?: string;
}

export interface ApiKeyStatus {
  valid: boolean;
  message?: string;
}

// -----------------------------------------------------------------------------
// Autobooking Types
// -----------------------------------------------------------------------------
export interface Autobooking {
  id: string;
  name: string;
  enabled: boolean;
  userId?: number;
  draftId: string;
  warehouseId: number;
  warehouseIds?: string[];
  transitWarehouseId?: number | null;
  transitWarehouseName?: string | null;
  supplierId: string;
  supplyType: string;
  dateType: 'WEEK' | 'MONTH' | 'CUSTOM_PERIOD' | 'CUSTOM_DATES' | 'CUSTOM_DATES_SINGLE';
  startDate?: string | null;
  endDate?: string | null;
  customDates?: string[];
  completedDates?: string[];
  maxCoefficient: number;
  coefficient?: number;
  monotype: boolean;
  monopalletCount?: number | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED' | 'ERROR';
  bookedAt?: string | null;
  bookedDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AutobookingStatus = 'active' | 'paused' | 'completed' | 'failed';

export interface AutobookingCreateData {
  name: string;
  draftId: string;
  warehouseId: number | null;
  transitWarehouseId?: number | null;
  transitWarehouseName?: string | null;
  supplyType: string;
  dateType: string;
  startDate?: string | null;
  endDate?: string | null;
  customDates?: (string | Date)[];
  maxCoefficient: number;
  monopalletCount?: number | null;
}

export interface AutobookingUpdateData {
  name?: string;
  draftId?: string;
  warehouseId?: number | null;
  transitWarehouseId?: number | null;
  transitWarehouseName?: string | null;
  supplyType?: string;
  dateType?: string;
  startDate?: string | null;
  endDate?: string | null;
  customDates?: (string | Date)[];
  maxCoefficient?: number;
  monopalletCount?: number | null;
}

// -----------------------------------------------------------------------------
// Warehouse Types
// -----------------------------------------------------------------------------
export interface Warehouse {
  id: string;
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
  warehouseId: string;
  boxTypeId?: number;
  coefficient: number;
  date: string;
}

// -----------------------------------------------------------------------------
// Trigger Types
// -----------------------------------------------------------------------------
export type SearchMode =
  | 'TODAY'
  | 'TOMORROW'
  | 'WEEK'
  | 'UNTIL_FOUND'
  | 'CUSTOM_DATES'
  | 'RANGE';

export interface SupplyTrigger {
  id: string;
  userId: number;
  warehouseIds: number[];
  supplyTypes: ('BOX' | 'MONOPALLETE' | 'SUPERSAFE')[];
  isActive: boolean;
  checkInterval: number;
  maxCoefficient: number;
  createdAt: string;
  updatedAt: string;
  status: 'RELEVANT' | 'COMPLETED' | 'EXPIRED';
  lastNotificationAt: string | null;
  searchMode: SearchMode;
  startDate?: string | null;
  endDate?: string | null;
  selectedDates: string[];
}

export interface CreateTriggerRequest {
  warehouseIds: number[];
  supplyTypes: ('BOX' | 'MONOPALLETE' | 'SUPERSAFE')[];
  checkInterval: number;
  maxCoefficient: number;
  searchMode: SearchMode;
  startDate?: string | null;
  endDate?: string | null;
  selectedDates?: string[];
}

// Legacy types for backward compatibility
export interface Trigger {
  id: string;
  date: string;
  warehouseId: string;
  warehouseName: string;
  maxCoefficient: number;
  enabled: boolean;
  createdAt: string;
}

export interface TriggerCreateData {
  date: string;
  warehouseIds: string[];
  maxCoefficient: number;
}

export interface TriggerUpdateData extends Partial<TriggerCreateData> {
  enabled?: boolean;
}

// -----------------------------------------------------------------------------
// Reschedule Types
// -----------------------------------------------------------------------------
export interface Reschedule {
  id: string;
  supplyId: string;
  originalDate: string;
  targetDate: string;
  status: RescheduleStatus;
  monotype: boolean;
  createdAt: string;
}

export type RescheduleStatus = 'pending' | 'completed' | 'failed';

export interface RescheduleCreateData {
  supplyId: string;
  targetDate: string;
  monotype: boolean;
}

export interface RescheduleUpdateData extends Partial<RescheduleCreateData> {}

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

export interface SupplyDetails {
  id: string;
  date: string;
  warehouseId: string;
  warehouseName: string;
  goods: Array<{
    sku: string;
    quantity: number;
  }>;
}

// -----------------------------------------------------------------------------
// Draft Types
// -----------------------------------------------------------------------------
export interface Draft {
  id: string;
  supplierId: number;
  name: string;
  goodsCount: number;
  goods?: DraftGood[];
  createdAt: string;
}

export interface DraftGood {
  id?: string;
  article?: string;
  sa?: string;
  name: string;
  subjectName?: string;
  quantity: number;
  image?: string;
  imgSrc?: string;
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
  // Extended report data
  totalBookings: number;
  bookingsByMonth: Array<{ month: string; count: number }>;
  warehouseStats: Array<{ name: string; count: number }>;
  coefficientStats: Array<{ range: string; count: number }>;
  warehouseSuggestions: Array<{
    warehouseId: string;
    name: string;
    reason: string;
    score: number;
  }>;
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
  description: string;
  price: number;
  duration: number;
  period?: 'month' | 'year';
  features?: string[];
}

export interface Payment {
  id: string;
  amount: number;
  status: string;
  paymentUrl?: string;
  createdAt: string;
  tariffId?: string;
  userId?: number;
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

// -----------------------------------------------------------------------------
// Auth Step Types
// -----------------------------------------------------------------------------
export type AuthStep = 'idle' | 'phone' | 'sms' | 'two_factor' | 'completed' | 'error';
