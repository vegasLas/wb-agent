import apiClient from './client';

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

export interface SupplyGood {
  imgSrc?: string;
  imtName?: string;
  quantity?: number;
  barcode?: string;
  brandName?: string;
  subjectName?: string;
  colorName?: string;
}

export interface SupplyDetailsResponse {
  success: boolean;
  data?: {
    goods: SupplyGood[];
    supply: SupplyDetails;
    totalCount: number;
  };
  error?: string;
}

export const supplyDetailsAPI = {
  /**
   * GET /api/v1/supplies/supply-details
   * Get details for a specific supply
   */
  async fetchSupplyDetails(
    supplyId: string | number,
  ): Promise<SupplyDetailsResponse> {
    const response = await apiClient.get<SupplyDetailsResponse>(
      '/supplies/supply-details',
      {
        params: { supplyId },
      },
    );
    return response.data;
  },
};
