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
    drafts: Draft[];
  };
}

export interface Draft {
  id: string;
  name: string;
  supplierId: string;
  totalQuantity: number;
  totalGoods: number;
  createdAt: string;
  updatedAt: string;
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
    supplies: WBDraftSupply[];
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
    goods: SupplyGood[];
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
  boxTypeName: 'Короба' | 'Суперсейф' | 'Монопаллеты' | 'QR-поставка с коробами';
  /** Box type ID */
  boxTypeID?: 2 | 5 | 6;
  /** Whether unloading is allowed */
  allowUnload: boolean;
}
