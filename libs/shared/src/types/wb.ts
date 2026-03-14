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
