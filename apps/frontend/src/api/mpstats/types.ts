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
  customTitle?: string;
  brand: string;
  subjectName: string;
  image: string;
  favourite?: boolean;
}

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

export interface MpstatsTokenStatus {
  success: boolean;
  hasToken: boolean;
}
