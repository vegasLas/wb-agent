import type {
  BoxTariffWarehouse,
  BoxTariffsData,
  CommissionRate,
  PalletTariffWarehouse,
  PalletTariffsData,
  AcceptanceCoefficientItem,
  ReturnTariffWarehouse,
  ReturnTariffsData,
  AggregatedTariffWarehouse,
} from './wb-tariffs-official.service';

// ---------------------------------------------------------------------------
// DTOs — Lean shapes exposed to consumers (frontend, AI tools, controllers)
// ---------------------------------------------------------------------------

/** Single warehouse box tariff (lean view). */
export interface BoxTariffDTO {
  warehouseName: string;
  geoName: string;
  boxDeliveryBase: string;
  boxDeliveryLiter: string;
  boxStorageBase: string;
  boxStorageLiter: string;
  boxDeliveryMarketplaceBase: string;
  boxDeliveryMarketplaceLiter: string;
}

/** Box tariffs response for consumers. */
export interface BoxTariffsResponseDTO {
  dtNextBox: string;
  dtTillMax: string;
  warehouseList: BoxTariffDTO[];
}

/** Single warehouse pallet tariff (lean view). */
export interface PalletTariffDTO {
  warehouseName: string;
  palletDeliveryExpr: string;
  palletDeliveryValueBase: string;
  palletDeliveryValueLiter: string;
  palletStorageExpr: string;
  palletStorageValueExpr: string;
}

/** Pallet tariffs response for consumers. */
export interface PalletTariffsResponseDTO {
  dtNextPallet: string;
  dtTillMax: string;
  warehouseList: PalletTariffDTO[];
}

/** Single warehouse return tariff (lean view). */
export interface ReturnTariffDTO {
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

/** Return tariffs response for consumers. */
export interface ReturnTariffsResponseDTO {
  dtNextDeliveryDumpKgt: string;
  dtNextDeliveryDumpSrg: string;
  dtNextDeliveryDumpSup: string;
  warehouseList: ReturnTariffDTO[];
}

/** Single acceptance coefficient item (lean view). */
export interface AcceptanceCoefficientDTO {
  date: string;
  coefficient: number;
  warehouseID: number;
  warehouseName: string;
  allowUnload: boolean;
  boxTypeID: number;
  storageCoef: string | null;
  deliveryCoef: string | null;
  deliveryBaseLiter: string | null;
  deliveryAdditionalLiter: string | null;
  storageBaseLiter: string | null;
  storageAdditionalLiter: string | null;
  isSortingCenter: boolean;
}

/** Single commission rate (lean view). */
export interface CommissionDTO {
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

/** Legacy-compatible aggregated tariff warehouse (lean view). */
export interface AggregatedTariffWarehouseDTO {
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

/** Legacy-compatible aggregated tariffs response. */
export interface AggregatedTariffsResponseDTO {
  warehouselist: AggregatedTariffWarehouseDTO[];
}

// ---------------------------------------------------------------------------
// Mappers — Transform official upstream types → lean DTOs
// ---------------------------------------------------------------------------

export function toBoxTariffDTO(warehouse: BoxTariffWarehouse): BoxTariffDTO {
  return {
    warehouseName: warehouse.warehouseName,
    geoName: warehouse.geoName,
    boxDeliveryBase: warehouse.boxDeliveryBase,
    boxDeliveryLiter: warehouse.boxDeliveryLiter,
    boxStorageBase: warehouse.boxStorageBase,
    boxStorageLiter: warehouse.boxStorageLiter,
    boxDeliveryMarketplaceBase: warehouse.boxDeliveryMarketplaceBase,
    boxDeliveryMarketplaceLiter: warehouse.boxDeliveryMarketplaceLiter,
  };
}

export function toBoxTariffsResponseDTO(data: BoxTariffsData): BoxTariffsResponseDTO {
  return {
    dtNextBox: data.dtNextBox,
    dtTillMax: data.dtTillMax,
    warehouseList: (data.warehouseList || []).map(toBoxTariffDTO),
  };
}

export function toPalletTariffDTO(warehouse: PalletTariffWarehouse): PalletTariffDTO {
  return {
    warehouseName: warehouse.warehouseName,
    palletDeliveryExpr: warehouse.palletDeliveryExpr,
    palletDeliveryValueBase: warehouse.palletDeliveryValueBase,
    palletDeliveryValueLiter: warehouse.palletDeliveryValueLiter,
    palletStorageExpr: warehouse.palletStorageExpr,
    palletStorageValueExpr: warehouse.palletStorageValueExpr,
  };
}

export function toPalletTariffsResponseDTO(data: PalletTariffsData): PalletTariffsResponseDTO {
  return {
    dtNextPallet: data.dtNextPallet,
    dtTillMax: data.dtTillMax,
    warehouseList: (data.warehouseList || []).map(toPalletTariffDTO),
  };
}

export function toReturnTariffDTO(warehouse: ReturnTariffWarehouse): ReturnTariffDTO {
  return {
    warehouseName: warehouse.warehouseName,
    deliveryDumpKgtOfficeBase: warehouse.deliveryDumpKgtOfficeBase,
    deliveryDumpKgtOfficeLiter: warehouse.deliveryDumpKgtOfficeLiter,
    deliveryDumpKgtReturnExpr: warehouse.deliveryDumpKgtReturnExpr,
    deliveryDumpSrgOfficeExpr: warehouse.deliveryDumpSrgOfficeExpr,
    deliveryDumpSrgReturnExpr: warehouse.deliveryDumpSrgReturnExpr,
    deliveryDumpSupCourierBase: warehouse.deliveryDumpSupCourierBase,
    deliveryDumpSupCourierLiter: warehouse.deliveryDumpSupCourierLiter,
    deliveryDumpSupOfficeBase: warehouse.deliveryDumpSupOfficeBase,
    deliveryDumpSupOfficeLiter: warehouse.deliveryDumpSupOfficeLiter,
    deliveryDumpSupReturnExpr: warehouse.deliveryDumpSupReturnExpr,
  };
}

export function toReturnTariffsResponseDTO(data: ReturnTariffsData): ReturnTariffsResponseDTO {
  return {
    dtNextDeliveryDumpKgt: data.dtNextDeliveryDumpKgt,
    dtNextDeliveryDumpSrg: data.dtNextDeliveryDumpSrg,
    dtNextDeliveryDumpSup: data.dtNextDeliveryDumpSup,
    warehouseList: (data.warehouseList || []).map(toReturnTariffDTO),
  };
}

export function toAcceptanceCoefficientDTO(item: AcceptanceCoefficientItem): AcceptanceCoefficientDTO {
  return {
    date: item.date,
    coefficient: item.coefficient,
    warehouseID: item.warehouseID,
    warehouseName: item.warehouseName,
    allowUnload: item.allowUnload,
    boxTypeID: item.boxTypeID,
    storageCoef: item.storageCoef,
    deliveryCoef: item.deliveryCoef,
    deliveryBaseLiter: item.deliveryBaseLiter,
    deliveryAdditionalLiter: item.deliveryAdditionalLiter,
    storageBaseLiter: item.storageBaseLiter,
    storageAdditionalLiter: item.storageAdditionalLiter,
    isSortingCenter: item.isSortingCenter,
  };
}

export function toAggregatedTariffWarehouseDTO(
  warehouse: AggregatedTariffWarehouse,
): AggregatedTariffWarehouseDTO {
  return {
    office_id: warehouse.office_id,
    warehouseName: warehouse.warehouseName,
    delivery: warehouse.delivery,
    deliveryMonoAndMix: warehouse.deliveryMonoAndMix,
    deliveryMonopallet: warehouse.deliveryMonopallet,
    deliveryReturn: warehouse.deliveryReturn,
    storageMonoAndMix: warehouse.storageMonoAndMix,
    storageMonopallet: warehouse.storageMonopallet,
    acceptanceMonoAndMix: warehouse.acceptanceMonoAndMix,
    acceptanceMonopallet: warehouse.acceptanceMonopallet,
    acceptanceSuperSafe: warehouse.acceptanceSuperSafe,
    deliverySubjectSettingByVolume: warehouse.deliverySubjectSettingByVolume,
  };
}

export function toAggregatedTariffsResponseDTO(
  data: { warehouselist: AggregatedTariffWarehouse[] },
): AggregatedTariffsResponseDTO {
  return {
    warehouselist: (data.warehouselist || []).map(toAggregatedTariffWarehouseDTO),
  };
}

export function toCommissionDTO(rate: CommissionRate): CommissionDTO {
  return {
    subjectID: rate.subjectID,
    subjectName: rate.subjectName,
    parentID: rate.parentID,
    parentName: rate.parentName,
    kgvpMarketplace: rate.kgvpMarketplace,
    kgvpSupplier: rate.kgvpSupplier,
    kgvpSupplierExpress: rate.kgvpSupplierExpress,
    kgvpPickup: rate.kgvpPickup,
    kgvpBooking: rate.kgvpBooking,
    paidStorageKgvp: rate.paidStorageKgvp,
  };
}
