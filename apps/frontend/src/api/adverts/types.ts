import type {
  AdvertsResponse,
  AdvertPresetInfoResponse,
} from '../../types';

export interface FetchAdvertsParams {
  pageNumber?: number;
  pageSize?: number;
  status?: number[];
  order?: string;
  direction?: string;
  autofill?: string;
  bidType?: number[];
  type?: number[];
  filterState?: number;
}

export interface FetchAdvertPresetInfoParams {
  advertId: number;
  nmId: number; // Required by WB API - use top_nm from advert
  pageSize?: number;
  pageNumber?: number;
  filterQuery?: string;
  from?: string;
  to?: string;
  sortDirection?: string;
  calcPages?: boolean;
  calcTotal?: boolean;
  filterState?: number;
}

export {
  AdvertsResponse,
  AdvertPresetInfoResponse,
};
