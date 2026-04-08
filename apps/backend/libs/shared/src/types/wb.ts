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

// ============ Measurement Penalties Types ============

export interface MeasurementPenaltiesParams {
  dateFrom: string;
  dateTo: string;
  limit?: number;
  offset?: number;
}

export interface MeasurementPenaltiesResponse {
  data: MeasurementPenaltiesData;
  error: boolean;
  additionalErrors: unknown;
  errorText: string;
}

export interface MeasurementPenaltiesData {
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

// ============ Advertisement (CMP) Types ============

export interface AdvertsParams {
  page_number?: number;
  page_size?: number;
  status?: number[];
  order?: string;
  direction?: string;
  autofill?: string;
  bid_type?: number[];
  type?: number[];
}

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

export interface AdvertPresetInfoParams {
  advertId: number;
  page_size?: number;
  page_number?: number;
  filter_query?: string;
  from?: string;
  to?: string;
  sort_direction?: string;
  nm_id?: number;
  calc_pages?: boolean;
  calc_total?: boolean;
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

// ============ MPStats Types ============

export interface MPStatsItemSalesParams {
  nmId: number;
  d1: string;
  d2: string;
  fbs?: number;
}

export interface MPStatsItemSalesResponse {
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

export interface MPStatsItemSalesByRegionParams {
  nmId: number;
  d1: string;
  d2: string;
}

export interface MPStatsItemSalesByRegionResponse {
  store: string;
  sales: number;
}

// ============ Product Cards List Types ============

export interface ProductCardsListParams {
  settings: ProductCardsListSettings;
}

export interface ProductCardsListSettings {
  sort?: {
    ascending: boolean;
  };
  filter?: ProductCardsListFilter;
  cursor?: ProductCardsListCursor;
}

export interface ProductCardsListFilter {
  textSearch?: string;
  allowedCategoriesOnly?: boolean;
  tagIDs?: number[];
  objectIDs?: number[];
  brands?: string[];
  imtID?: number;
  withPhoto?: number;
}

export interface ProductCardsListCursor {
  updatedAt?: string;
  nmID?: number;
  limit?: number;
}

export interface ProductCardsListResponse {
  cards: ProductCard[];
  cursor: ProductCardsListResponseCursor;
}

export interface ProductCardsListResponseCursor {
  updatedAt: string;
  nmID: number;
  total: number;
}

export interface ProductCard {
  nmID: number;
  imtID: number;
  nmUUID: string;
  subjectID: number;
  subjectName: string;
  vendorCode: string;
  brand: string;
  title: string;
  description: string;
  needKiz: boolean;
  photos: ProductCardPhoto[];
  wholesale?: {
    enabled: boolean;
    quantum: number;
  };
  dimensions: ProductCardDimensions;
  characteristics: ProductCardCharacteristic[];
  sizes: ProductCardSize[];
  tags: ProductCardTag[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductCardPhoto {
  cnm?: string;
  big?: string;
  small?: string;
}

export interface ProductCardDimensions {
  length: number;
  width: number;
  height: number;
  weightBrutto: number;
  isValid: boolean;
}

export interface ProductCardCharacteristic {
  id: number;
  name: string;
  value: (string | number)[];
}

export interface ProductCardSize {
  chrtID: number;
  techSize: string;
  wbSize?: string;
  skus: string[];
}

export interface ProductCardTag {
  id: number;
  name: string;
  color: string;
}
