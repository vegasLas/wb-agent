import { wbOfficialRequest } from '@/utils/wb-official-request';
import { createLogger } from '@/utils/logger';
import { calculateTariffCost } from './wb-tariff-calculator.service';
import {
  validateSupplierId,
  validateDate,
  validatePositiveInteger,
  validatePositiveNumber,
  validateNonNegativeNumber,
} from './wb-official-validation';
import { parseWbNumber, formatWbCost } from './wb-official-helpers';

const logger = createLogger('WBTariffsOfficial');

const BASE_URL = 'https://common-api.wildberries.ru';
const CATEGORY = 'CONTENT';

// ---------------------------------------------------------------------------
// Upstream types — match the official WB Common API response exactly
// ---------------------------------------------------------------------------

export interface BoxTariffWarehouse {
  warehouseName: string;
  boxDeliveryBase: string;
  boxDeliveryLiter: string;
  boxDeliveryCoefExpr: string;
  boxDeliveryMarketplaceBase: string;
  boxDeliveryMarketplaceCoefExpr: string;
  boxDeliveryMarketplaceLiter: string;
  boxStorageBase: string;
  boxStorageLiter: string;
  boxStorageCoefExpr: string;
  geoName: string;
}

export interface BoxTariffsData {
  dtNextBox: string;
  dtTillMax: string;
  warehouseList: BoxTariffWarehouse[];
}

/** Raw wrapper returned by the WB box tariffs endpoint. */
interface BoxTariffsApiResponse {
  response: {
    data: BoxTariffsData;
  };
}

export interface PalletTariffWarehouse {
  warehouseName: string;
  palletDeliveryExpr: string;
  palletDeliveryValueBase: string;
  palletDeliveryValueLiter: string;
  palletStorageExpr: string;
  palletStorageValueExpr: string;
}

export interface PalletTariffsData {
  dtNextPallet: string;
  dtTillMax: string;
  warehouseList: PalletTariffWarehouse[];
}

/** Raw wrapper returned by the WB pallet tariffs endpoint. */
interface PalletTariffsApiResponse {
  response: {
    data: PalletTariffsData;
  };
}

export interface ReturnTariffWarehouse {
  warehouseName: string;
  deliveryDumpKgtOfficeBase: string;
  deliveryDumpKgtOfficeLiter: string;
  deliveryDumpKgtReturnExpr: string;
  deliveryDumpSrgOfficeExpr: string;
  deliveryDumpSrgReturnExpr: string;
  deliveryDumpSupCourierBase: string;
  deliveryDumpSupCourierLiter: string;
  deliveryDumpSupOfficeBase: string;
  deliveryDumpSupOfficeLiter: string;
  deliveryDumpSupReturnExpr: string;
}

export interface ReturnTariffsData {
  dtNextDeliveryDumpKgt: string;
  dtNextDeliveryDumpSrg: string;
  dtNextDeliveryDumpSup: string;
  warehouseList: ReturnTariffWarehouse[];
}

/** Raw wrapper returned by the WB return tariffs endpoint. */
interface ReturnTariffsApiResponse {
  response: {
    data: ReturnTariffsData;
  };
}

export interface AcceptanceCoefficientItem {
  date: string;
  coefficient: number;
  warehouseID: number;
  warehouseName: string;
  allowUnload: boolean;
  boxTypeID: number; // 2 = Box, 5 = Monopallet, 6 = Supersafe
  storageCoef: string | null;
  deliveryCoef: string | null;
  deliveryBaseLiter: string | null;
  deliveryAdditionalLiter: string | null;
  storageBaseLiter: string | null;
  storageAdditionalLiter: string | null;
  isSortingCenter: boolean;
}

export interface CommissionRate {
  subjectID: number;
  subjectName: string;
  parentID: number;
  parentName: string;
  kgvpMarketplace: number;
  kgvpSupplier: number;
  kgvpSupplierExpress: number;
  kgvpPickup: number;
  kgvpBooking: number;
  paidStorageKgvp: number;
}

/** Raw wrapper returned by the WB commission endpoint. */
interface CommissionApiResponse {
  report: CommissionRate[];
}

export interface GetBoxTariffsParams {
  supplierId: string;
  date: string; // YYYY-MM-DD
}

export interface GetPalletTariffsParams {
  supplierId: string;
  date: string; // YYYY-MM-DD
}

export interface GetReturnTariffsParams {
  supplierId: string;
  date: string; // YYYY-MM-DD
}

export interface GetAcceptanceCoefficientsParams {
  supplierId: string;
  warehouseIDs?: string; // comma-separated list of warehouse IDs
}

export interface GetCommissionParams {
  supplierId: string;
  subjectID: number;
}

export interface GetCalculatedTariffsParams {
  supplierId: string;
  width: number;
  height: number;
  length: number;
  weight: number;
}

export interface AggregatedTariffWarehouse {
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

export interface AggregatedTariffsResponse {
  warehouselist: AggregatedTariffWarehouse[];
}

function computeAcceptanceCost(
  volume: number,
  base: number | null,
  additional: number | null,
  coefficient: number | null,
  threshold = 5,
): number {
  if (base === null || coefficient === null) {
    return 0;
  }
  const effectiveAdditional = additional ?? 0;
  if (volume <= threshold) {
    return base * coefficient;
  }
  return (base + (volume - threshold) * effectiveAdditional) * coefficient;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class WBTariffsOfficialService {
  /**
   * Get box tariffs from common-api.wildberries.ru.
   * Returns raw tariff data; the caller must calculate actual costs
   * based on product dimensions vs tariff thresholds.
   *
   * Official docs: https://dev.wildberries.ru/docs/openapi/wb-tariffs#tag/Tarify-na-ostatok
   */
  async getBoxTariffs({
    supplierId,
    date,
  }: GetBoxTariffsParams): Promise<BoxTariffsData> {
    validateSupplierId(supplierId);
    validateDate(date, 'date');

    const raw = await wbOfficialRequest<BoxTariffsApiResponse>({
      baseUrl: BASE_URL,
      path: `/api/v1/tariffs/box?date=${encodeURIComponent(date)}`,
      supplierId,
      category: CATEGORY,
      method: 'GET',
    });

    const data = raw?.response?.data;
    if (!data || !Array.isArray(data.warehouseList)) {
      logger.warn('Empty or malformed box tariffs response', { supplierId, date });
      return {
        dtNextBox: date,
        dtTillMax: date,
        warehouseList: [],
      };
    }

    return data;
  }

  /**
   * Get pallet (monopallet) tariffs from common-api.wildberries.ru.
   * Returns raw tariff data for items supplied on pallets.
   *
   * Official docs: https://dev.wildberries.ru/docs/openapi/wb-tariffs#tag/Tarify-na-ostatok/paths/~1api~1v1~1tariffs~1pallet/get
   */
  async getPalletTariffs({
    supplierId,
    date,
  }: GetPalletTariffsParams): Promise<PalletTariffsData> {
    validateSupplierId(supplierId);
    validateDate(date, 'date');

    const raw = await wbOfficialRequest<PalletTariffsApiResponse>({
      baseUrl: BASE_URL,
      path: `/api/v1/tariffs/pallet?date=${encodeURIComponent(date)}`,
      supplierId,
      category: CATEGORY,
      method: 'GET',
    });

    const data = raw?.response?.data;
    if (!data || !Array.isArray(data.warehouseList)) {
      logger.warn('Empty or malformed pallet tariffs response', { supplierId, date });
      return {
        dtNextPallet: date,
        dtTillMax: date,
        warehouseList: [],
      };
    }

    return data;
  }

  /**
   * Get return tariffs from common-api.wildberries.ru.
   * Returns return-delivery costs per warehouse.
   *
   * Official docs: https://dev.wildberries.ru/docs/openapi/wb-tariffs#tag/Stoimost-vozvrata-prodavcu/paths/~1api~1v1~1tariffs~1return/get
   */
  async getReturnTariffs({
    supplierId,
    date,
  }: GetReturnTariffsParams): Promise<ReturnTariffsData> {
    validateSupplierId(supplierId);
    validateDate(date, 'date');

    const raw = await wbOfficialRequest<ReturnTariffsApiResponse>({
      baseUrl: BASE_URL,
      path: `/api/v1/tariffs/return?date=${encodeURIComponent(date)}`,
      supplierId,
      category: CATEGORY,
      method: 'GET',
    });

    const data = raw?.response?.data;
    if (!data || !Array.isArray(data.warehouseList)) {
      logger.warn('Empty or malformed return tariffs response', { supplierId, date });
      return {
        dtNextDeliveryDumpKgt: date,
        dtNextDeliveryDumpSrg: date,
        dtNextDeliveryDumpSup: date,
        warehouseList: [],
      };
    }

    return data;
  }

  /**
   * Get acceptance coefficients from common-api.wildberries.ru.
   * Returns supply tariffs (coefficients & base costs) per warehouse,
   * per supply type (boxTypeID), for the next 14 days.
   *
   * Official docs: https://dev.wildberries.ru/docs/openapi/wb-tariffs#tag/Tarify-na-postavku/paths/~1api~1tariffs~1v1~1acceptance~1coefficients/get
   */
  async getAcceptanceCoefficients({
    supplierId,
    warehouseIDs,
  }: GetAcceptanceCoefficientsParams): Promise<AcceptanceCoefficientItem[]> {
    if (!supplierId || supplierId.trim().length === 0) {
      throw new Error('supplierId is required');
    }

    let path = '/api/tariffs/v1/acceptance/coefficients';
    if (warehouseIDs) {
      path += `?warehouseIDs=${encodeURIComponent(warehouseIDs)}`;
    }

    const raw = await wbOfficialRequest<AcceptanceCoefficientItem[]>({
      baseUrl: BASE_URL,
      path,
      supplierId,
      category: CATEGORY,
      method: 'GET',
    });

    if (!Array.isArray(raw)) {
      logger.warn('Empty or malformed acceptance coefficients response', { supplierId, warehouseIDs });
      return [];
    }

    return raw;
  }

  /**
   * Get commission rate by subject ID from common-api.wildberries.ru.
   * The commission endpoint returns the full report; this method filters
   * client-side to the requested subjectID.
   */
  async getCommissionBySubject({
    supplierId,
    subjectID,
  }: GetCommissionParams): Promise<CommissionRate | null> {
    validateSupplierId(supplierId);
    validatePositiveInteger(subjectID, 'subjectID');

    const raw = await wbOfficialRequest<CommissionApiResponse>({
      baseUrl: BASE_URL,
      path: '/api/v1/tariffs/commission?locale=ru',
      supplierId,
      category: CATEGORY,
      method: 'GET',
    });

    const report = raw?.report;
    if (!Array.isArray(report) || report.length === 0) {
      logger.warn('Empty or malformed commission response', { supplierId, subjectID });
      return null;
    }

    const match = report.find((r) => r.subjectID === subjectID);
    return match ?? null;
  }

  /**
   * Aggregate box, pallet, return, and acceptance data to produce a
   * legacy-compatible warehouse tariff list.
   *
   * Calls 4 official endpoints in parallel, then calculates delivery,
   * storage, and acceptance costs per warehouse.
   */
  async getAggregatedTariffs({
    supplierId,
    width,
    height,
    length,
    weight,
    date,
  }: GetCalculatedTariffsParams & { date?: string }): Promise<AggregatedTariffsResponse> {
    validateSupplierId(supplierId);
    validatePositiveNumber(width, 'width');
    validatePositiveNumber(height, 'height');
    validatePositiveNumber(length, 'length');
    validateNonNegativeNumber(weight, 'weight');

    const targetDate = date || new Date().toISOString().split('T')[0];

    const [boxData, palletData, returnData, acceptanceData] = await Promise.all([
      this.getBoxTariffs({ supplierId, date: targetDate }),
      this.getPalletTariffs({ supplierId, date: targetDate }),
      this.getReturnTariffs({ supplierId, date: targetDate }),
      this.getAcceptanceCoefficients({ supplierId }),
    ]);

    const volume = (length * width * height) / 1000;

    // Build lookup maps by warehouse name
    const palletMap = new Map<string, PalletTariffWarehouse>();
    for (const w of palletData.warehouseList) {
      palletMap.set(w.warehouseName, w);
    }

    const returnMap = new Map<string, ReturnTariffWarehouse>();
    for (const w of returnData.warehouseList) {
      returnMap.set(w.warehouseName, w);
    }

    const acceptanceMap = new Map<string, AcceptanceCoefficientItem[]>();
    for (const item of acceptanceData) {
      const list = acceptanceMap.get(item.warehouseName) || [];
      list.push(item);
      acceptanceMap.set(item.warehouseName, list);
    }

    const warehouselist: AggregatedTariffWarehouse[] = [];

    for (const boxTariff of boxData.warehouseList) {
      const warehouseName = boxTariff.warehouseName;
      const palletTariff = palletMap.get(warehouseName);
      const returnTariff = returnMap.get(warehouseName);
      const warehouseAcceptance = acceptanceMap.get(warehouseName) || [];

      // Box delivery + storage
      let boxDeliveryCost = 0;
      let boxStorageCost = 0;
      try {
        const boxCost = calculateTariffCost({
          length,
          width,
          height,
          type: 'box',
          tariffData: boxTariff,
        });
        boxDeliveryCost = boxCost.deliveryCost;
        boxStorageCost = boxCost.storageCostDaily;
      } catch {
        // Leave as 0 if calculation fails
      }

      // Pallet delivery + storage
      let palletDeliveryCost = 0;
      let palletStorageCost = 0;
      if (palletTariff) {
        try {
          const palletCost = calculateTariffCost({
            length,
            width,
            height,
            type: 'monopallet',
            tariffData: palletTariff,
          });
          palletDeliveryCost = palletCost.deliveryCost;
          palletStorageCost = palletCost.storageCostDaily;
        } catch {
          // Leave as 0 if calculation fails
        }
      }

      // Acceptance costs (box, monopallet, supersafe)
      const boxAcceptanceItem = warehouseAcceptance.find((i) => i.boxTypeID === 2);
      const monoAcceptanceItem = warehouseAcceptance.find((i) => i.boxTypeID === 5);
      const safeAcceptanceItem = warehouseAcceptance.find((i) => i.boxTypeID === 6);

      const boxAcceptanceCost = computeAcceptanceCost(
        volume,
        parseWbNumber(boxAcceptanceItem?.deliveryBaseLiter),
        parseWbNumber(boxAcceptanceItem?.deliveryAdditionalLiter),
        boxAcceptanceItem?.coefficient ?? null,
      );

      const monoAcceptanceCost = computeAcceptanceCost(
        volume,
        parseWbNumber(monoAcceptanceItem?.deliveryBaseLiter),
        parseWbNumber(monoAcceptanceItem?.deliveryAdditionalLiter),
        monoAcceptanceItem?.coefficient ?? null,
      );

      const safeAcceptanceCost = computeAcceptanceCost(
        volume,
        parseWbNumber(safeAcceptanceItem?.deliveryBaseLiter),
        parseWbNumber(safeAcceptanceItem?.deliveryAdditionalLiter),
        safeAcceptanceItem?.coefficient ?? null,
      );

      // Return delivery cost
      let returnCost = 0;
      if (returnTariff) {
        returnCost =
          parseWbNumber(returnTariff.deliveryDumpSupReturnExpr) ??
          parseWbNumber(returnTariff.deliveryDumpKgtReturnExpr) ??
          0;
      }

      // Find office_id from acceptance coefficients
      const officeId = boxAcceptanceItem?.warehouseID ?? monoAcceptanceItem?.warehouseID ?? safeAcceptanceItem?.warehouseID ?? 0;

      warehouselist.push({
        office_id: officeId,
        warehouseName,
        delivery: formatWbCost(boxDeliveryCost),
        deliveryMonoAndMix: formatWbCost(boxDeliveryCost),
        deliveryMonopallet: formatWbCost(palletDeliveryCost),
        deliveryReturn: formatWbCost(returnCost),
        storageMonoAndMix: formatWbCost(boxStorageCost),
        storageMonopallet: formatWbCost(palletStorageCost),
        acceptanceMonoAndMix: formatWbCost(boxAcceptanceCost),
        acceptanceMonopallet: formatWbCost(monoAcceptanceCost),
        acceptanceSuperSafe: formatWbCost(safeAcceptanceCost),
        deliverySubjectSettingByVolume: '',
      });
    }

    return { warehouselist };
  }

  /**
   * Helper: fetch box tariffs for today.
   * The official Common API does not accept product dimensions;
   * callers must perform their own cost calculations from the raw
   * tariff coefficients returned by this method.
   */
  async getCalculatedTariffs({
    supplierId,
  }: GetCalculatedTariffsParams): Promise<BoxTariffsData> {
    validateSupplierId(supplierId);
    const today = new Date().toISOString().split('T')[0];
    return this.getBoxTariffs({ supplierId, date: today });
  }
}

export const wbTariffsOfficialService = new WBTariffsOfficialService();
