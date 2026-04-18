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
