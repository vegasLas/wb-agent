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
  name?: string;
  autobookingCount: number;
  subscriptionExpiresAt: string | null;
  agreeTerms: boolean;
  selectedAccountId?: string;
  payments: Payment[];
  supplierApiKey?: {
    isExistAPIKey: boolean;
    createdAt: string;
    updatedAt: string;
  };
  accounts: Account[];
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
  phoneWb?: string;
  isActive?: boolean;
  suppliers: Supplier[];
  selectedSupplierId?: string;
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
  userId: number;
  supplierId: string;
  draftId: string;
  warehouseId: number;
  transitWarehouseId?: number | null;
  transitWarehouseName?: string | null;
  supplyType: 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';
  dateType: 'WEEK' | 'MONTH' | 'CUSTOM_PERIOD' | 'CUSTOM_DATES' | 'CUSTOM_DATES_SINGLE';
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  customDates?: Date[] | string[];
  maxCoefficient: number;
  monopalletCount?: number | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED' | 'ERROR';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type AutobookingStatus = 'active' | 'paused' | 'completed' | 'failed';

export interface AutobookingCreateData {
  accountId: string;
  draftId: string;
  warehouseId: number;
  transitWarehouseId?: number | null;
  transitWarehouseName?: string | null;
  supplyType: 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';
  dateType: 'WEEK' | 'MONTH' | 'CUSTOM_PERIOD' | 'CUSTOM_DATES' | 'CUSTOM_DATES_SINGLE';
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  customDates?: Date[] | string[];
  maxCoefficient: number;
  monopalletCount?: number | null;
}

export interface AutobookingUpdateData {
  draftId?: string;
  warehouseId?: number;
  transitWarehouseId?: number | null;
  transitWarehouseName?: string | null;
  supplyType?: 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';
  dateType?: 'WEEK' | 'MONTH' | 'CUSTOM_PERIOD' | 'CUSTOM_DATES' | 'CUSTOM_DATES_SINGLE';
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  customDates?: Date[] | string[];
  maxCoefficient?: number;
  monopalletCount?: number | null;
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
}

// -----------------------------------------------------------------------------
// Warehouse Types
// -----------------------------------------------------------------------------
export interface Warehouse {
  ID: number;
  name: string;
  address?: string;
  workTime?: string;
  acceptsQr?: boolean;
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
  warehouseName: string;
  boxTypeId: number;
  boxTypeName: string;
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
  | 'CUSTOM_DATES';

export interface SupplyTrigger {
  id: string;
  userId: number;
  warehouseIds: number[];
  supplyTypes: ('BOX' | 'MONOPALLETE' | 'SUPERSAFE')[];
  isActive: boolean;
  checkInterval: number;
  maxCoefficient: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  status: 'RELEVANT' | 'COMPLETED' | 'EXPIRED';
  lastNotificationAt: Date | string | null;
  searchMode: SearchMode;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  selectedDates: Date[] | string[];
}

// Alias for backward compatibility
export type Trigger = SupplyTrigger;

export interface CreateTriggerRequest {
  warehouseIds: number[];
  supplyTypes: ('BOX' | 'MONOPALLETE' | 'SUPERSAFE')[];
  checkInterval?: number;
  maxCoefficient: number;
  searchMode?: SearchMode;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  selectedDates?: Date[] | string[];
}

export interface UpdateTriggerRequest {
  triggerId: string;
  warehouseIds?: number[];
  supplyTypes?: ('BOX' | 'MONOPALLETE' | 'SUPERSAFE')[];
  isActive?: boolean;
}

// Legacy types for backward compatibility
export interface TriggerCreateData {
  warehouseIds: number[];
  supplyTypes: ('BOX' | 'MONOPALLETE' | 'SUPERSAFE')[];
  maxCoefficient: number;
  checkInterval?: number;
  searchMode?: SearchMode;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  selectedDates?: Date[] | string[];
}

export interface TriggerUpdateData {
  warehouseIds?: number[];
  supplyTypes?: ('BOX' | 'MONOPALLETE' | 'SUPERSAFE')[];
  isActive?: boolean;
}

// -----------------------------------------------------------------------------
// Reschedule Types
// -----------------------------------------------------------------------------
export interface AutobookingReschedule {
  id: string;
  userId: number;
  supplierId: string;
  warehouseId: number;
  dateType: 'WEEK' | 'MONTH' | 'CUSTOM_PERIOD' | 'CUSTOM_DATES_SINGLE';
  startDate: Date | string | null;
  endDate: Date | string | null;
  currentDate: Date | string;
  customDates: Date[] | string[];
  completedDates: Date[] | string[];
  maxCoefficient: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  supplyType: 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';
  supplyId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type RescheduleStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface Reschedule {
  id: string;
  supplyId: string;
  originalDate: string;
  targetDate: string;
  status: RescheduleStatus;
  monotype: boolean;
  createdAt: string;
}

export interface RescheduleCreateData {
  supplyId: string;
  targetDate: string;
  monotype: boolean;
}

export type RescheduleUpdateData = Partial<RescheduleCreateData>;

// Create/Update API request types
export interface CreateAutobookingRescheduleRequest {
  warehouseId: number;
  dateType: 'WEEK' | 'MONTH' | 'CUSTOM_PERIOD' | 'CUSTOM_DATES_SINGLE';
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  currentDate: Date | string;
  customDates?: Date[] | string[];
  maxCoefficient: number;
  supplyType: 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';
  supplyId: string;
}

export interface UpdateAutobookingRescheduleRequest {
  id: string;
  warehouseId?: number;
  dateType?: 'WEEK' | 'MONTH' | 'CUSTOM_PERIOD' | 'CUSTOM_DATES_SINGLE';
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  customDates?: Date[] | string[];
  maxCoefficient?: number;
  supplyType?: 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';
  supplyId?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
}

// -----------------------------------------------------------------------------
// Supply Types
// -----------------------------------------------------------------------------
export interface Supply {
  supplyId: number;
  supplyDate: string;
  warehouseId: number;
  warehouseName: string;
  boxTypeName: string;
  statusId: number;
  statusName: string;
}

export interface SupplyGood {
  imgSrc?: string;
  imtName?: string;
  quantity?: number;
  barcode?: string;
  brandName?: string;
  subjectName?: string;
  colorName?: string;
}

export interface SupplyDetails {
  id: number;
  supplyId: number;
  supplyDate: string;
  warehouseId: number;
  warehouseName: string;
  boxTypeName: string;
  statusId: number;
  statusName: string;
}

// -----------------------------------------------------------------------------
// Draft Types
// -----------------------------------------------------------------------------
/**
 * Draft - simplified format
 * Only includes fields the UI actually needs
 */
export interface Draft {
  id: string;
  supplierId: string;
  goodQuantity: number;
  barcodeQuantity: number;
  createdAt: string;
  goods?: DraftGood[];
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

// Sales Report Types (from deprecated project)
// Corresponds to ExcelItem from server/types/parse.ts
export interface ReportItem {
  brand: string;
  category: string;
  season: string;
  collection: string;
  productName: string;
  vendorCode: string;
  wbArticle: number;
  barcode: string;
  size: string;
  contract: string;
  warehouse: string;
  orderedQty: number;
  orderedSum: number;
  purchasedQty: number;
  purchasedSum: number;
  stockQty: number;
}

// Corresponds to ReportInfo from server/types/parse.ts
export interface ReportInfo {
  supplier: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  warehouse: string;
  rawTitle: string;
}

// Corresponds to FriendlyExcelData from server/types/parse.ts
export interface ReportParsedData {
  items: ReportItem[];
  meta: {
    totalItems: number;
    sheetName: string;
    allSheets: string[];
    reportInfo: ReportInfo;
  };
}

// Top-level structure the API expects
export interface ReportApiPayload {
  parsedData: ReportParsedData | null;
  error: string | null;
  reportPending?: boolean;
  estimatedWaitTime?: number | null;
}

export interface ReportRequestParams {
  limit?: number;
  offset?: number;
  dateFrom?: string; // Format: DD.MM.YY or YYYY-MM-DD
  dateTo?: string;   // Format: DD.MM.YY or YYYY-MM-DD
}

// Warehouse Suggestion Types
export interface WarehouseSuggestionItem {
  vendorCode: string;
  productName: string;
  stockQty: number;
  purchasedQty: number;
  calculatedDaysOfStock?: number;
  suggestedUnloadQty?: number;
  isReplenishment?: boolean;
}

export interface WarehouseSuggestion {
  warehouseName: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  relevantItems: WarehouseSuggestionItem[];
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

// -----------------------------------------------------------------------------
// Global Window Extensions
// -----------------------------------------------------------------------------
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        close: () => void;
        initData: string;
        initDataUnsafe: Record<string, unknown>;
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        bottomBarColor: string;
        ready: () => void;
        expand: () => void;
        enableClosingConfirmation: () => void;
        disableClosingConfirmation: () => void;
        showPopup: (params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: string; text: string }> }) => Promise<string>;
        showAlert: (message: string) => Promise<void>;
        showConfirm: (message: string) => Promise<boolean>;
        onEvent: (eventType: string, eventHandler: () => void) => void;
        offEvent: (eventType: string, eventHandler: () => void) => void;
        sendData: (data: string) => void;
        switchInlineQuery: (query: string, chooseChatTypes?: string[]) => void;
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        openInvoice: (url: string) => Promise<string>;
        readTextFromClipboard: () => Promise<string>;
        requestWriteAccess: () => Promise<boolean>;
        requestContact: () => Promise<boolean>;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive: boolean) => void;
          hideProgress: () => void;
        };
        BackButton: {
          isVisible: boolean;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
        };
      };
    };
  }
}
