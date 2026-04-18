export interface UserEnvInfo {
  screenResolution: [number, number];
  colorDepth: number;
  platform: string;
  language: string;
  userAgent: string;
  deviceMemory: number;
  hardwareConcurrency: number;
  timezone: number;
  plugins: string[];
  canvas: string;
  webgl: string;
  proxy: {
    ip: string;
    port: string;
    username: string;
    password: string;
  };
}

export interface CookieProps {
  WBTokenV3: string;
  zzatw: string;
  cfidsw: string;
  currentFeatureVersion: string;
  externalLocale: string;
  locale: string;
  wbxValidationKey: string;
  supplierId: string;
  supplierIdExternal: string;
  _wbauid?: string;
  landing_version_ru?: string;
}

export interface SupplierResponse {
  id: string;
  jsonrpc: string;
  result: {
    suppliers?: Supplier[];
    countries?: Country[];
  };
}

export interface Supplier {
  id: string;
  oldID: number;
  name: string;
  fullName: string;
  legalFormID: number;
  general: string;
  contactFullName: string;
  docID: string;
  errors: SupplierErrors;
  countryID: string;
  countryCode: string;
  juridicalAddress: string;
  factAddress: string;
  activityTypes: unknown[];
  tradeMark: string;
  address: Address;
  transliteration: Record<string, unknown>;
  taxationSystemID: number;
  warehousesIDs: unknown[];
  created_at: string;
  updatedAt: string;
  isDeleted: boolean;
  approvedStatus: string;
  approved: boolean;
  deactivated: boolean;
  correspondentAccount: string;
  bankName: string;
  bankAddress: string;
  paymentAccount: string;
  bic: string;
  ogrnip: string;
  vat: boolean;
  vatPercent: number;
  transitBank: TransitBank;
  bankruptcy: Bankruptcy;
  registrationMethod: string;
  currency: string;
  tariff: { id: number };
  inn: string;
  unp: string;
  bin: string;
  unn: string;
  tin: string;
  taxpayerCode: string;
  subscriptions: unknown[];
  financeID: number;
  quarantine: string;
  hasQuarantine: boolean;
  b2b: {
    enabled: boolean;
    updatedAt: string;
    expDate: string;
  };
}

interface SupplierErrors {
  name: string;
  countryID: string;
  countryCode: string;
  legalFormID: string;
  general: string;
  contactFullName: string;
  juridicalAddress: string;
  factAddress: string;
  correspondentAccount: string;
  bankName: string;
  bankAddress: string;
  paymentAccount: string;
  vat: string;
  vatPercent: string;
  unp: string;
  bin: string;
  unn: string;
  tin: string;
  taxpayerCode: string;
  swiftCode: string;
}

interface Address {
  region: string;
  regionCode: string;
  federalDistrict: string;
  city: string;
  postalCode: string;
  street: string;
}

interface TransitBank {
  bic: string;
  inn: string;
  paymentAccount: string;
}

interface Bankruptcy {
  isBankruptcy: boolean;
  date: string;
  accounts: unknown[];
}

export interface Country {
  id: string;
  value: string;
  label: string;
  active: boolean;
  countryCode: string;
}

export interface JsonRpcBody {
  method?: string;
  params: unknown;
}

export interface WBRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: JsonRpcBody | JsonRpcBody[];
  isJsonRpc?: boolean;
  parseResponse?: boolean;
  order?: number;
}

export interface WBError {
  message: string;
  status?: number;
  method?: string;
  url?: string;
}

// ============ Supplier Service Types ============

export interface ListGoodsParams {
  draftID: string;
  search?: string;
  brands?: string[];
  subjects?: number[];
  limit?: number;
  offset?: number;
  supplierId?: string;
}

export interface ListDraftsParams {
  limit?: number;
  offset?: number;
  orderBy?: { createdAt?: number };
  supplierId?: string;
}

export interface ValidateWarehouseGoodsParams {
  draftID: string;
  warehouseId: number;
  transitWarehouseId: number | null;
}

export interface WarehouseRecommendationsParams {
  draftId: string;
}

export interface ListSuppliesParams {
  pageNumber: number;
  pageSize: number;
  sortBy: string;
  sortDirection: string;
  statusId: number;
}

export interface SupplyDetailsParams {
  pageNumber: number;
  pageSize: number;
  preorderID: number | null;
  search: string;
  supplyID: number;
}

export interface BalancesParams {
  limit: number;
  offset: number;
}

// ============ WB API Response Types ============

export interface ListGoodsResponse {
  id: string;
  jsonrpc: string;
  result: {
    goods: Good[];
  };
}

export interface Good {
  nmID: number;
  id: number;
  chrtID: number;
  draftID: string;
  subjectId: number;
  subjectName: string;
  brand: string;
  supplierArticle: string;
  techSize: string;
  productName: string;
  barcode: string;
  quantity: number;
}

export interface ListDraftsResponse {
  id: string;
  jsonrpc: string;
  result: {
    drafts: WBDraft[];
  };
}

/**
 * Draft from WB API - internal raw format
 */
export interface WBDraft {
  ID: string;
  supplierID: string;
  createdBy: number;
  author: string;
  goodQuantity: number;
  barcodeQuantity: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Draft - simplified format for frontend
 * Only includes fields the UI actually needs
 */
export interface Draft {
  id: string;
  supplierId: string;
  goodQuantity: number;
  barcodeQuantity: number;
  createdAt: string;
}

export interface ValidateWarehouseGoodsResponse {
  id: string;
  jsonrpc: string;
  result: {
    valid: boolean;
    errors?: ValidationError[];
  };
}

export interface ValidationError {
  code: string;
  message: string;
  nmID?: number;
}

export interface WarehouseRecommendationsResponse {
  id: string;
  jsonrpc: string;
  result: {
    recommendations: WarehouseRecommendation[];
  };
}

export interface WarehouseRecommendation {
  warehouseId: number;
  warehouseName: string;
  score: number;
}

export interface ListSuppliesResponse {
  id: string;
  jsonrpc: string;
  result: {
    data: WBDraftSupply[];
    total: number;
  };
}

export interface WBDraftSupply {
  id: number;
  status: string;
  statusId: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyDetailsResponse {
  id: string;
  jsonrpc: string;
  result: {
    supply: SupplyDetail;
    data: SupplyGood[];
    totalCount: number;
  };
}

export interface SupplyDetail {
  id: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyGood {
  nmID: number;
  supplierArticle: string;
  productName: string;
  quantity: number;
}

export interface BalancesResponse {
  data: {
    table: {
      headerFront: Array<{
        cells: Array<{
          value: string;
        }>;
      }>;
      data: string[][];
    };
  };
}

export interface GoodBalance {
  goodName: string;
  brand: string;
  subject: string;
  supplierArticle: string;
  quantity: number;
}

// ============ Warehouse Types ============

export interface TransitResponse {
  id: string;
  jsonrpc: string;
  result: {
    items: TransitItem[];
  };
}

export interface TransitItem {
  transitWarehouseId: number;
  transitWarehouseName: string;
  destinationWarehouseId: number;
  destinationWarehouseName: string;
  currentTariff: number;
  tariffTable: {
    perVolume: Array<{
      from: number;
      to: number;
      value: number;
    }>;
    perWeight: number;
  };
  storeBox: boolean;
  storePallet: boolean;
  storeSupersafe: boolean;
  transitActiveFrom: string;
}

export interface WarehousesRoot {
  id: string;
  jsonrpc: string;
  result: {
    resp: {
      data: WarehouseData[];
      counters: {
        isFbw: number;
        isFbs: number;
        isDistribution: number;
        isPickPoints: number;
        isService: number;
        isInternational: number;
        total: number;
      };
      filters: {
        isViewAcceptsQRScan: boolean;
      };
      sort: Array<{
        id: string;
        title: string;
      }>;
      officeType: unknown[];
      error: boolean;
      errorText: string;
      additionalErrors: Record<string, unknown>;
    };
  };
}

export interface WarehouseData {
  id: number;
  origid: number;
  warehouse: string;
  loadingSchedule: string;
  workTime: string;
  address: string;
  latitude: number;
  longitude: number;
  passText: string;
  isPassNeeded: boolean;
  nearCityId: number;
  nearCity: {
    id: number;
    title: string;
  };
  sortingTime: number;
  photos: string[];
  isFbw: boolean;
  isFbwRestrictionCargo: string;
  isFbs: boolean;
  isFbsRestrictionCargo: string;
  isDistribution: boolean;
  isDistributionRestrictionCargo: string;
  isPickPoints: boolean;
  isPickPointsRestrictionCargo: string;
  isService: boolean;
  isServiceRestrictionCargo: string;
  isInternational: boolean;
  restrictions: string;
  rating: number;
  isAcceptsQRScan: boolean;
  isDontCheckDeliveryPeriod: boolean;
  isDontCheckSortingTime: boolean;
  isDefaultPaidAcceptance: boolean;
  isDefaultPaidAcceptanceOfSupply: boolean;
  deliveryPeriodToShelfInt?: number;
  deliveryPeriodToShelf?: string;
  boxTypeMask: number;
  noPassEqueueAllowed: boolean;
  gates?: string;
  officeTimeOffset?: number;
}

// Simplified warehouse type for API response
export interface Warehouse {
  ID: number;
  name: string;
  address: string;
  workTime: string;
  acceptsQr: boolean;
}

export enum AcceptanceType {
  box = 6,
  pallet = 4,
  supersafe = 5,
}

export interface AcceptanceCoefficientsResponse {
  id: string;
  jsonrpc: string;
  result: {
    report: Array<{
      date: string;
      acceptanceType: AcceptanceType;
      coefficient: number;
      warehouseID: number;
      warehouseName: string;
      allowUnload: boolean;
      isSortingCenter: boolean;
      deliveryCoefficient?: string;
      storageCoefficient?: string;
      deliveryBaseLiter?: string;
      deliveryAdditionalLiter?: string;
      storageBaseLiter?: string;
      storageAdditionalLiter?: string;
    }>;
  };
}

// ============ Coefficient/Trigger Types ============

/**
 * Supply/Coefficient from WB API coefficients endpoint
 * Used for trigger monitoring to find available slots
 * Matches the original type from deprecated project
 */
export interface Supply {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Coefficient value (0 = free, higher = more expensive) */
  coefficient: number;
  /** Warehouse ID */
  warehouseID: number;
  /** Warehouse name */
  warehouseName: string;
  /** Box type name (in Russian) */
  boxTypeName:
    | 'Короба'
    | 'Суперсейф'
    | 'Монопаллеты'
    | 'QR-поставка с коробами';
  /** Box type ID */
  boxTypeID?: 2 | 5 | 6;
  /** Whether unloading is allowed */
  allowUnload: boolean;
}

// ============ Promotions Calendar Types ============

export interface PromotionsTimelineResponse {
  data: {
    promotions: Promotion[];
    participationCounts: ParticipationCounts;
  };
}

export interface ParticipationCounts {
  available: number;
  participating: number;
  skipped: number;
  all: number;
}

export interface Promotion {
  promoID: number;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  advantages: string[];
  promotion: string;
  participation: Participation;
}

export interface Participation {
  status: string;
  counts: Counts;
}

export interface Counts {
  eligible: number;
  participating: number;
  available: number;
  participatingOutOfStock: number;
  availableOutOfStock: number;
}

export interface PromotionDetailResponse {
  data: {
    promoID: number;
    periodID: number;
    groupID: number;
    name: string;
    description: string;
    formattedDescription: string;
    advantages: string[];
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
    ranging: Ranging;
    sppProperties?: unknown;
    isMultiLevels: boolean;
    selectedDiscountLevelName?: unknown;
    discountOptions?: unknown;
    isParticipateForAnalytics: boolean;
  };
}

export interface Ranging {
  levels: Level[];
  boost: string;
  currentCoefficient: number;
  isMaxLevel: boolean;
  nmToNextLevel: number;
  nmToMaxLevel: number;
}

export interface Level {
  nomenclatures: number;
  coefficient: number;
}

export type PromotionExcelCreateResponse = Record<string, never>;

export interface PromotionExcelGetResponse {
  data: PromotionExcelData;
}

export interface PromotionExcelData {
  uploadDate: string;
  file: string;
}

export interface PromotionRecoveryRequest {
  periodID: number;
  isRecovery: boolean;
  file: string;
}

export type PromotionRecoveryResponse = Record<string, never>;

export interface PromotionRecoveryInitRequest {
  periodID: number;
  isRecovery: boolean;
}

export type PromotionRecoveryInitResponse = Record<string, never>;

export interface PromotionRecoveryBody {
  periodID: number;
  selectedItems: string[];
  isRecovery: boolean; // true = recover only selected items, false = exclude selected items (keep the rest)
}

// ============ Measurement Penalties Types ============

export interface MeasurementPenaltyResponse {
  data: MeasurementPenaltyData;
  error: boolean;
  additionalErrors: unknown;
  errorText: string;
}

export interface MeasurementPenaltyData {
  reports: MeasurementPenaltyReport[];
  totalCount: number;
}

export interface MeasurementPenaltyReport {
  nmId: number;
  subject: string;
  dimId: number;
  prcOver: number;
  volume: number;
  width: number;
  length: number;
  height: number;
  volumeSup: number;
  widthSup: number;
  lengthSup: number;
  heightSup: number;
  photoUrls: string[];
  bonusType: number;
  bonusSumm: number;
  supplierId: number;
  dtBonus: string;
  isValid: boolean;
  isValidDt: string;
  reversalAmount: number;
  penaltyAmount: number;
}

// ============ Adverts Types ============

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

// ============ Advert Preset Info Types ============

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

// ============ Region Sales Types ============

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

// ============ MPStats Types ============

export interface MpstatsSalesItem {
  no_data: number;
  data: string;
  balance: string;
  sales: number;
  rating: number;
  price: number;
  final_price: number;
  is_new: number;
  comments: number;
  discount: number;
  basic_sale: number;
  basic_price: number;
  promo_sale: number;
  client_sale: number;
  client_price: number;
  categories_cnt: string;
  visibility: number;
  position: number;
}

export interface MpstatsSalesByRegionItem {
  store: string;
  sales: number;
}

export interface MpstatsBalanceByRegionItem {
  store: string;
  balance: number;
}

export interface MpstatsSkuSummary {
  nmId: number;
  sales: MpstatsSalesItem[];
  salesByRegion: MpstatsSalesByRegionItem[];
  balanceByRegion: MpstatsBalanceByRegionItem[];
  itemFull: MpstatsItemFull;
}

// ============ MPStats Full Item Types ============

export interface MpstatsPhotoListItem {
  f: string;
  t: string;
}

export interface MpstatsPhoto {
  count: number;
  is_changed: boolean;
  list: MpstatsPhotoListItem[];
}

export interface MpstatsSubject {
  id: number;
  name: string;
  group?: unknown;
  basic_logistics: number;
  storage_price: number;
  acceptance_price: number;
  delivery_by_volume: number;
  commission: {
    fbo: number;
    fbs: number;
  };
  purchase: {
    is_purchase: number;
    purchase: number;
    purchase_after_return: number;
  };
}

export interface MpstatsItemFull {
  id: number;
  product_id: number;
  name: string;
  full_name: string;
  link: string;
  subject: MpstatsSubject;
  brand: string;
  seller: {
    id: number;
    name: string;
  };
  color: {
    color: string;
    colors: {
      revenue: number;
      balance: number;
    };
    all_colors: Array<{
      color: string;
      id: number;
      photo: string;
    }>;
  };
  photo: MpstatsPhoto;
  rating: number;
  rating_mpstats: number;
  stock: {
    fbo: number;
    fbs: number;
  };
  orders: number;
  comments: number;
  price: {
    price: number;
    final_price: number;
    wallet_price: number;
  };
  balance: number;
  discount: number;
  is_new: number;
  first_date: string;
  country: string;
  gender: string;
  sizes: unknown[];
  score: {
    date: string;
    score: number;
    scores: number[];
  };
  note?: unknown;
  access_edit_sales_data: boolean;
  period_stats: {
    id: number;
    subject_id: number;
    rating: number;
    cardratingval: number;
    top_hours: unknown[];
    top_sells: number;
    revenue: number;
    revenue_avg: number;
    revenue_avg_with_stock: number;
    revenue_estimated: number;
    sales: number;
    sales_avg: number;
    sales_top_percent: number;
    sales_avg_with_stock: number;
    sales_estimated: number;
    days_in_stock: number;
    revenue_potential: number;
    lost_profit: number;
    lost_profit_percent: number;
    purchase: number;
    purchase_after_return: number;
    revenue_prev: number;
    sales_prev: number;
    sales_heatmap: Array<{
      hour: number;
      avg_sales: number;
    }>;
  };
  updated: string;
}

export interface MpstatsCard {
  nmID: number;
  name: string;
  brand: string;
  subjectName: string;
  image: string;
  favourite?: boolean;
}

// ============ Content Card (WB Viewer) Types ============

export interface ContentCardTableListResponse {
  data: ContentCardTableListData;
  error: boolean;
  errorText: string;
  additionalErrors: Record<string, unknown>;
}

export interface ContentCardTableListData {
  cards: ContentCard[];
  cursor: ContentCardCursor;
}

export interface ContentCardCursor {
  next: boolean;
  n: number;
  value: null;
  nmID: number;
}

export interface ContentCard {
  imtID: number;
  nmID: number;
  vendorCode: string;
  updateAt: string;
  brandRaw: string;
  title: string;
  mediaFiles: Record<string, ContentCardMediaFile>;
  brand: string;
  subject: string;
  colors: string[];
  sizes: ContentCardSize[];
  tags: unknown[];
  stocks: number;
  meta: ContentCardMeta;
  externalBan: null;
  feedbackRating: number;
  feedbacks: ContentCardFeedbacks;
  hasPaidOptions: ContentCardPaidOptions;
}

export interface ContentCardPaidOptions {
  hasPhotoTags: boolean;
  hasRichContent: boolean;
  hasAutoplayVideo: boolean;
  hasClientTryOn: boolean;
}

export interface ContentCardFeedbacks {
  rating: number;
  count: number;
}

export interface ContentCardMeta {
  dimensionsWarning: boolean;
  hasDimensionDeviation: boolean;
  tnvedWarning: boolean;
  needKiz: boolean;
  needUIN: boolean;
  ratingData: ContentCardRatingData;
  withABTest: boolean;
  noWeightBruttoWarning: boolean;
  hasWeightBruttoDeviation: boolean;
  richModerationFail: boolean;
}

export interface ContentCardRatingData {
  rating: number;
  isCardRated: boolean;
  errors: ContentCardRatingError[];
}

export interface ContentCardRatingError {
  field: string;
  details: string[];
}

export interface ContentCardSize {
  sizeID: number;
  techSize: string;
  skus: string[];
  wbSize: string;
  currency: string;
  currentPrice: number;
}

export interface ContentCardMediaFile {
  value: string;
  thumbnail?: string;
  preview?: string;
  mimeType: string;
}

export interface ContentCardImtResponse {
  data: ContentCardImtData;
  error: boolean;
  errorText: string;
  additionalErrors: Record<string, unknown>;
}

export interface ContentCardImtData {
  imtID: number;
  subjectInfo: ContentCardSubjectInfo;
  variants: ContentCardVariant[];
  ratings: ContentCardImtRating[];
  isRegionalSizes: boolean;
}

export interface ContentCardImtRating {
  rating: number;
  isCardRated: boolean;
  errors: ContentCardRatingError[];
}

export interface ContentCardVariant {
  nmID: number;
  nmUUID: string;
  vendorCode: string;
  title: string;
  description: string;
  brand: ContentCardBrand;
  tnved: string;
  sizes: ContentCardVariantSize[];
  mediaFiles: Record<string, ContentCardMediaFile>;
  dimensions: ContentCardDimensions;
  characteristics: ContentCardCharacteristic[];
  needKiz: boolean;
  kizMarked: boolean;
  isSwatchTryOn: boolean;
  isKizUserMarked: boolean;
  hasPhotoTags: boolean;
  isAutoplayingVideo: boolean;
  isAutoplayingCatalogVideo: boolean;
  isAdult: boolean;
  isDimensionsApprovedByUser: boolean;
  attachments: unknown[];
  isBlockedAdultAttribute: boolean;
  autoplay: ContentCardAutoplay;
}

export interface ContentCardAutoplay {
  enableJamAutoplayingVideo: boolean;
  enableTariffProductCardAutoplayingVideo: boolean;
  enableTariffCatalogAutoplayingVideo: boolean;
}

export interface ContentCardCharacteristic {
  type: string;
  value: string[] | unknown[] | null | number | string;
}

export interface ContentCardDimensions {
  width: number;
  height: number;
  length: number;
  weightBrutto: number;
}

export interface ContentCardVariantSize {
  chrtID: number;
  techSize: string;
  wbSize: string;
  skus: string[];
  price: number;
  currency: string;
}

export interface ContentCardBrand {
  title: string;
  id: number;
  originalMark: ContentCardOriginalMark;
}

export interface ContentCardOriginalMark {
  isActive: boolean;
  expiredAt: string;
}

export interface ContentCardSubjectInfo {
  parent: string;
  subject: string;
  predictedSubjects: unknown[];
  supplierSubject: string;
  translates: ContentCardTranslates;
}

export interface ContentCardTranslates {
  parent: string;
  subject: string;
  supplierSubject: string;
}

// ============ Content Card Tariffs Types ============

export interface ContentCardTariffsResponse {
  data: ContentCardTariffsData;
  error: boolean;
  errorText: string;
  additionalErrors: null;
}

export interface ContentCardTariffsData {
  warehouselist: ContentCardWarehouseTariff[];
}

export interface ContentCardWarehouseTariff {
  office_id: number;
  warehouseSort: number;
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

// ============ Content Card Categories Types ============

export interface ContentCardCategoriesResponse {
  data: ContentCardCategoriesData;
  error: boolean;
  errorText: string;
  additionalErrors: null;
}

export interface ContentCardCategoriesData {
  categories: ContentCardCategory[];
  columns: string[];
  length: number;
  countryCode: string;
}

export interface ContentCardCategory {
  id: number;
  name: string;
  subject: string;
  percent: number;
  percentFBS: number;
  kgvpSupplier: number;
  kgvpSupplierExpress: number;
  kgvpPickup: number;
}
