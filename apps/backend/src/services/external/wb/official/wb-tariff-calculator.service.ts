import type {
  BoxTariffWarehouse,
  PalletTariffWarehouse,
  AcceptanceCoefficientItem,
} from './wb-tariffs-official.service';
import { parseWbNumber } from './wb-official-helpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SupplyType = 'box' | 'monopallet' | 'supersafe';

/** WB acceptance-coefficient boxTypeID values per supply type. */
export const SUPPLY_TYPE_BOX_TYPE_ID: Record<SupplyType, number> = {
  box: 2,
  monopallet: 5,
  supersafe: 6,
};

export interface CalculateCostParams {
  /** Length in centimeters */
  length: number;
  /** Width in centimeters */
  width: number;
  /** Height in centimeters */
  height: number;
  /** Supply type determines which tariff fields to use */
  type: SupplyType;
  /**
   * Tariff data for the target warehouse.
   * Can be BoxTariffWarehouse, PalletTariffWarehouse, or AcceptanceCoefficientItem.
   */
  tariffData: BoxTariffWarehouse | PalletTariffWarehouse | AcceptanceCoefficientItem;
}

export interface CalculatedCost {
  /** Volume in liters (L × W × H / 1000) */
  volumeLiters: number;
  /** Final delivery cost in rubles */
  deliveryCost: number;
  /** Final storage cost per day in rubles */
  storageCostDaily: number;
}

/**
 * Calculate volume in liters from dimensions in centimeters.
 * V = (L × W × H) / 1000
 */
function calculateVolume(length: number, width: number, height: number): number {
  return (length * width * height) / 1000;
}

/**
 * Compute cost using the piece-rate formula:
 * If V ≤ threshold: base × (coef / 100)
 * If V > threshold: (base + (V - threshold) × additional) × (coef / 100)
 *
 * The WB formula uses a 5-liter threshold.
 */
function computeCost(
  volume: number,
  base: number | null,
  additional: number | null,
  coefficient: number | null,
  threshold = 5,
): number {
  if (base === null || coefficient === null) {
    throw new Error(
      `Missing required tariff fields: base=${base}, coefficient=${coefficient}`,
    );
  }

  const effectiveAdditional = additional ?? 0;
  const multiplier = coefficient / 100;

  if (volume <= threshold) {
    return base * multiplier;
  }

  return (base + (volume - threshold) * effectiveAdditional) * multiplier;
}

// ---------------------------------------------------------------------------
// Field extractors per supply type
// ---------------------------------------------------------------------------

interface TariffFields {
  baseDelivery: number | null;
  addDelivery: number | null;
  baseStorage: number | null;
  addStorage: number | null;
  warehouseDeliveryCoef: number | null;
  warehouseStorageCoef: number | null;
}

function extractBoxTariffFields(data: BoxTariffWarehouse): TariffFields {
  return {
    baseDelivery: parseWbNumber(data.boxDeliveryBase),
    addDelivery: parseWbNumber(data.boxDeliveryLiter),
    baseStorage: parseWbNumber(data.boxStorageBase),
    addStorage: parseWbNumber(data.boxStorageLiter),
    warehouseDeliveryCoef: parseWbNumber(data.boxDeliveryCoefExpr),
    warehouseStorageCoef: parseWbNumber(data.boxStorageCoefExpr),
  };
}

function extractPalletTariffFields(data: PalletTariffWarehouse): TariffFields {
  return {
    baseDelivery: parseWbNumber(data.palletDeliveryValueBase),
    addDelivery: parseWbNumber(data.palletDeliveryValueLiter),
    baseStorage: parseWbNumber(data.palletStorageValueExpr),
    addStorage: null, // Pallet storage is usually returned as a single computed value
    warehouseDeliveryCoef: parseWbNumber(data.palletDeliveryExpr),
    warehouseStorageCoef: parseWbNumber(data.palletStorageExpr),
  };
}

function extractAcceptanceCoefficientFields(data: AcceptanceCoefficientItem): TariffFields {
  return {
    baseDelivery: parseWbNumber(data.deliveryBaseLiter),
    addDelivery: parseWbNumber(data.deliveryAdditionalLiter),
    baseStorage: parseWbNumber(data.storageBaseLiter),
    addStorage: parseWbNumber(data.storageAdditionalLiter),
    warehouseDeliveryCoef: parseWbNumber(data.deliveryCoef),
    warehouseStorageCoef: parseWbNumber(data.storageCoef),
  };
}

function extractFields(
  type: SupplyType,
  data: BoxTariffWarehouse | PalletTariffWarehouse | AcceptanceCoefficientItem,
): TariffFields {
  // If the caller passes an AcceptanceCoefficientItem, validate its boxTypeID
  // against the requested supply type before extracting fields.
  if ('boxTypeID' in data) {
    const expectedBoxTypeID = SUPPLY_TYPE_BOX_TYPE_ID[type];
    if (data.boxTypeID !== expectedBoxTypeID) {
      throw new Error(
        `boxTypeID mismatch: expected ${expectedBoxTypeID} for "${type}", got ${data.boxTypeID}`,
      );
    }
    return extractAcceptanceCoefficientFields(data);
  }

  switch (type) {
    case 'box':
    case 'supersafe':
      return extractBoxTariffFields(data as BoxTariffWarehouse);
    case 'monopallet':
      return extractPalletTariffFields(data as PalletTariffWarehouse);
    default:
      // AcceptanceCoefficientItem is handled above by the 'boxTypeID' in data check.
      // This branch is unreachable for well-typed inputs.
      throw new Error(`Unexpected supply type: ${type}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers for acceptance-coefficient arrays
// ---------------------------------------------------------------------------

/**
 * Filter an array of acceptance coefficients to a specific supply type.
 *
 * boxTypeID mapping:
 *   2 = Box
 *   5 = Monopallet
 *   6 = Supersafe
 */
export function filterAcceptanceCoefficientsBySupplyType(
  items: AcceptanceCoefficientItem[],
  type: SupplyType,
): AcceptanceCoefficientItem[] {
  const targetBoxTypeID = SUPPLY_TYPE_BOX_TYPE_ID[type];
  return items.filter((item) => item.boxTypeID === targetBoxTypeID);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate delivery and storage costs for a product based on its dimensions
 * and the tariff data from WB Common API.
 *
 * Formulas:
 *   V = (L × W × H) / 1000
 *   Delivery:
 *     V ≤ 5  → BaseDelivery × (WarehouseDeliveryCoef / 100)
 *     V > 5  → (BaseDelivery + (V - 5) × AddDelivery) × (WarehouseDeliveryCoef / 100)
 *   Storage (daily):
 *     V ≤ 5  → BaseStorage × (WarehouseStorageCoef / 100)
 *     V > 5  → (BaseStorage + (V - 5) × AddStorage) × (WarehouseStorageCoef / 100)
 */
export function calculateTariffCost({
  length,
  width,
  height,
  type,
  tariffData,
}: CalculateCostParams): CalculatedCost {
  if (!Number.isFinite(length) || length <= 0) {
    throw new Error('length must be a positive number');
  }
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error('width must be a positive number');
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new Error('height must be a positive number');
  }

  const volume = calculateVolume(length, width, height);
  const fields = extractFields(type, tariffData);

  const deliveryCost = computeCost(
    volume,
    fields.baseDelivery,
    fields.addDelivery,
    fields.warehouseDeliveryCoef,
  );

  const storageCostDaily = computeCost(
    volume,
    fields.baseStorage,
    fields.addStorage,
    fields.warehouseStorageCoef,
  );

  return {
    volumeLiters: Math.round(volume * 1000) / 1000,
    deliveryCost: Math.round(deliveryCost * 100) / 100,
    storageCostDaily: Math.round(storageCostDaily * 100) / 100,
  };
}
