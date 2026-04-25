// =============================================================================
// Base TypeScript Types for WB Agent Frontend
// =============================================================================

// -----------------------------------------------------------------------------
// View Types
// -----------------------------------------------------------------------------
export type ViewType =
  | 'home'
  | 'tasks'
  | 'wb'
  | 'mpstats'
  | 'triggers-main'
  | 'triggers-form'
  | 'autobookings-form'
  | 'autobookings-update'
  | 'autobookings-main'
  | 'reschedules-main'
  | 'reschedules-form'
  | 'reschedules-update'
  | 'promotions'
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
  id?: number;
  name?: string;
  username?: string;
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
  hasMpstatsToken?: boolean;
  accounts: Account[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

// -----------------------------------------------------------------------------
// Permission Types
// -----------------------------------------------------------------------------
export type Permission = 'PROMOTIONS' | 'FEEDBACKS' | 'REPORTS' | 'ADVERTS' | 'SUPPLIES';

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
  permissions?: Permission[];
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
  dateType:
    | 'WEEK'
    | 'MONTH'
    | 'CUSTOM_PERIOD'
    | 'CUSTOM_DATES'
    | 'CUSTOM_DATES_SINGLE';
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
  dateType:
    | 'WEEK'
    | 'MONTH'
    | 'CUSTOM_PERIOD'
    | 'CUSTOM_DATES'
    | 'CUSTOM_DATES_SINGLE';
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
  dateType?:
    | 'WEEK'
    | 'MONTH'
    | 'CUSTOM_PERIOD'
    | 'CUSTOM_DATES'
    | 'CUSTOM_DATES_SINGLE';
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
  dateType: 'WEEK' | 'MONTH' | 'CUSTOM_PERIOD' | 'CUSTOM_DATES' | 'CUSTOM_DATES_SINGLE';
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
  dateType: 'WEEK' | 'MONTH' | 'CUSTOM_PERIOD' | 'CUSTOM_DATES' | 'CUSTOM_DATES_SINGLE';
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
  dateTo?: string; // Format: DD.MM.YY or YYYY-MM-DD
}

// Region Sales Report Types
export interface RegionSaleResponse {
  data: RegionSaleData;
  error: boolean;
  errorText: string;
  additionalErrors?: unknown;
}

export interface RegionSaleData {
  salesRows: RegionSaleRow[];
  cursor: RegionSaleCursor;
}

export interface RegionSaleCursor {
  limit: number;
  offset: number;
  total: number;
}

export interface RegionSaleRow {
  country: string;
  fedOkr: string;
  oblasts: RegionSaleOblast[];
  qty: number;
  reward: number;
  share: number;
}

export interface RegionSaleOblast {
  oblast: string;
  cities: RegionSaleCity[];
  qty: number;
  reward: number;
  share: number;
}

export interface RegionSaleCity {
  city: string;
  qty: number;
  reward: number;
  share: number;
}

export interface RegionSaleRequestBody {
  dateFrom: string;
  dateTo: string;
  limit?: number;
  offset?: number;
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
export type AuthStep =
  | 'idle'
  | 'phone'
  | 'sms'
  | 'two_factor'
  | 'completed'
  | 'error';

// -----------------------------------------------------------------------------
// Promotions Calendar Types
// -----------------------------------------------------------------------------
export type PromotionFilter = 'AVAILABLE' | 'PARTICIPATING' | 'SKIPPING';

export interface ParticipationCounts {
  available: number;
  participating: number;
  skipped: number;
  all: number;
}

export interface PromotionsTimelineResponse {
  data: {
    promotions: PromotionItem[];
    participationCounts: ParticipationCounts;
  };
}

export interface PromotionItem {
  promoID: number;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  advantages: readonly string[];
  promotion: string;
  participation: PromotionParticipation;
}

export interface PromotionParticipation {
  status: string;
  counts: PromotionCounts;
}

export interface PromotionCounts {
  eligible: number;
  participating: number;
  available: number;
  participatingOutOfStock: number;
  availableOutOfStock: number;
}

export interface PromotionDetailResponse {
  data: PromotionDetail;
}

export interface PromotionDetail {
  promoID: number;
  periodID: number;
  groupID: number;
  name: string;
  description: string;
  formattedDescription: string;
  advantages: readonly string[];
  startDt: string;
  endDt: string;
  status: number;
  participationStatus: string;
  isAutoAction: boolean;
  isImportant: boolean;
  isAnnouncement: boolean;
  inPromoActionLeftovers: number;
  inPromoActionTotal: number;
  isHasNotParticipationNm: boolean;
  isHasRecovery: boolean;
  isParticipateInAutoPromo: boolean;
  isHasAnalyticalCalculations: boolean;
  notInPromoActionLeftovers: number;
  notInPromoActionTotal: number;
  participationPercentage: number;
  participationPercentageForSpp: number;
  calculateProductsCount: number;
  actionInStock: number;
  autoPromo?: unknown;
  ranging: PromotionRanging;
  sppProperties?: unknown;
  isMultiLevels: boolean;
  selectedDiscountLevelName?: unknown;
  discountOptions?: unknown;
  isParticipateForAnalytics: boolean;
  participation?: PromotionParticipation;
}

export interface PromotionRanging {
  levels: readonly PromotionLevel[];
  boost: string;
  currentCoefficient: number;
  isMaxLevel: boolean;
  nmToNextLevel: number;
  nmToMaxLevel: number;
}

export interface PromotionLevel {
  nomenclatures: number;
  coefficient: number;
}

export interface PromotionExcelItem {
  inPromo: string;
  brand: string;
  subject: string;
  name: string;
  vendorCode: string;
  wbCode: string;
  daysOnSite: number;
  turnover: number;
  wbStock: number;
  sellerStock: number;
  promoPrice: number;
  currentPrice: number;
  currency: string;
  currentDiscount: number;
  uploadedDiscount: number;
}

/** Maps camelCase field names to Russian display headers */
export const PROMOTION_EXCEL_DISPLAY_NAMES: Record<
  keyof PromotionExcelItem,
  string
> = {
  inPromo: 'Товар уже участвует в акции',
  brand: 'Бренд',
  subject: 'Предмет',
  name: 'Наименование',
  vendorCode: 'Артикул поставщика',
  wbCode: 'Артикул WB',
  daysOnSite: 'Количество дней на сайте',
  turnover: 'Оборачиваемость',
  wbStock: 'Остаток товара на складах Wb (шт.)',
  sellerStock: 'Остаток товара на складе продавца Wb (шт.)',
  promoPrice: 'Плановая цена для акции',
  currentPrice: 'Текущая розничная цена',
  currency: 'Валюта',
  currentDiscount: 'Текущая скидка на сайте, %',
  uploadedDiscount: 'Загружаемая скидка для участия в акции',
};

export interface PromotionParsedData {
  items: PromotionExcelItem[];
  meta: {
    totalItems: number;
    sheetName: string;
    allSheets: string[];
    reportInfo: ReportInfo;
  };
}

export interface PromotionApiPayload {
  items: PromotionExcelItem[] | null;
  error: string | null;
  reportPending?: boolean;
  estimatedWaitTime?: number | null;
}

export interface PromotionRecoveryParams {
  periodID: number;
  selectedItems: string[]; // supplier article IDs like "BOX20CARD"
  isRecovery: boolean; // true = recover only selected items, false = exclude selected items
}

// -----------------------------------------------------------------------------
// Adverts Types
// -----------------------------------------------------------------------------
export interface AdvertsResponse {
  http_status: number;
  error: string;
  code: number;
  counts: AdvertsCounts;
  content: AdvertContent[];
}

export interface AdvertsCounts {
  totalCount: number;
  pauseCount: number;
}

export interface AdvertContent {
  id: number;
  type: number;
  bid_type: number;
  status_id: number;
  campaign_name: string;
  create_date: string;
  payment_model: string;
  active_targets: number[];
  products_count: number;
  top_nm: number;
  budget: number;
  autofill: AdvertAutofill;
}

export interface AdvertAutofill {
  is_enable: boolean;
  error: unknown;
}

export interface AdvertPresetInfoResponse {
  items: AdvertPresetItem[];
  total: AdvertPresetTotal;
  count: number;
}

export interface AdvertPresetItem {
  name: string;
  views: number;
  clicks: number;
  baskets: number;
  orders: number;
  ctr: number;
  cpc: number;
  cpm: number;
  avg_pos: number;
  shks: number;
  is_excluded: boolean;
  spend: number;
  currency: string;
}

export interface AdvertPresetTotal {
  name: string;
  views: number;
  clicks: number;
  baskets: number;
  orders: number;
  ctr: number;
  cpc: number;
  cpm: number;
  avg_pos: number;
  shks: number;
  is_excluded: boolean;
  spend: number;
  currency: string;
}

// -----------------------------------------------------------------------------
// Content Cards Types
// -----------------------------------------------------------------------------

export interface ContentCardTableItem {
  title: string;
  nmID: number;
  currentPrice: number | null;
  stocks: number;
  subject: string;
  feedbackRating: number;
  vendorCode: string;
  thumbnail: string | null;
}

export interface ContentCardTableListResponse {
  cards: ContentCardTableItem[];
  cursor: {
    next: boolean;
    n: number;
    nmID: number;
  };
  totalCount: number;
}

export interface CommissionCategory {
  id: number;
  name: string;
  subject: string;
  percent: number;
  percentFBS: number;
  kgvpSupplier: number;
  kgvpSupplierExpress: number;
  kgvpPickup: number;
}

export interface ContentCardCommissionsResponse {
  categories: CommissionCategory[];
  length: number;
  countryCode: string;
}

export interface TariffWarehouse {
  office_id: number;
  warehouseName: string;
  delivery: string;
  deliveryMonoAndMix: string;
  deliveryMonopallet: string;
  deliveryReturn: string;
  storageMonoAndMix: string;
  storageMonopallet: string;
  acceptanceMonoAndMix: string;
  acceptanceMonopallet: string;
  acceptanceSuperSafe: string;
  deliverySubjectSettingByVolume: string;
}

export interface ContentCardTariffsResponse {
  warehouselist: TariffWarehouse[];
}

// -----------------------------------------------------------------------------
// Auth Types
// -----------------------------------------------------------------------------
export type AuthMode = 'telegram' | 'browser';

export interface BrowserUser {
  id: number;
  login: string;
  name: string;
}

// -----------------------------------------------------------------------------
// Global Window Extensions
// -----------------------------------------------------------------------------
declare global {
  interface Window {
    /** True if running inside Telegram WebApp (set by early detection script) */
    __IS_TELEGRAM_WEBAPP__?: boolean;
    /** True if browser mode is forced via URL params (set by early detection script) */
    __FORCE_BROWSER_MODE__?: boolean;
    /** Current auth mode: 'telegram' or 'browser' (set by early detection script) */
    __AUTH_MODE__?: AuthMode;
    
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
        showPopup: (params: {
          title?: string;
          message: string;
          buttons?: Array<{ id?: string; type?: string; text: string }>;
        }) => Promise<string>;
        showAlert: (message: string) => Promise<void>;
        showConfirm: (message: string) => Promise<boolean>;
        onEvent: (eventType: string, eventHandler: () => void) => void;
        offEvent: (eventType: string, eventHandler: () => void) => void;
        sendData: (data: string) => void;
        switchInlineQuery: (query: string, chooseChatTypes?: string[]) => void;
        openLink: (
          url: string,
          options?: { try_instant_view?: boolean },
        ) => void;
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
