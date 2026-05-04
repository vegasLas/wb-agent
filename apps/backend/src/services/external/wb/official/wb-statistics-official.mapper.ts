import type {
  WarehouseRemainsItem,
  RegionSaleRow,
} from './wb-statistics-official.service';
import type { GoodBalance, Warehouse, RegionSaleData } from '@/types/wb';
import { convertWarehouseName } from '@/utils/warehouseNames';

export interface BalancesByWarehouse {
  warehouseId: number;
  goods: GoodBalance[];
}

/**
 * Transform official API WarehouseRemainsItem[] into the legacy
 * { warehouseId, goods: GoodBalance[] }[] shape used by the frontend.
 *
 * @param items - Raw warehouse remains from the official API
 * @param warehouses - Cached warehouse list for name→ID mapping
 */
export function mapWarehouseRemainsToBalancesByWarehouse(
  items: WarehouseRemainsItem[],
  warehouses: Warehouse[] | null | undefined,
): BalancesByWarehouse[] {
  const warehouseMapping = new Map<string, number>();
  if (warehouses) {
    for (const warehouse of warehouses) {
      warehouseMapping.set(warehouse.name, warehouse.ID);
    }
  }

  const byWarehouse = new Map<number, GoodBalance[]>();

  for (const item of items) {
    if (!item.warehouseName || !item.supplierArticle || item.quantity <= 0) {
      continue;
    }

    const russianName = convertWarehouseName(item.warehouseName);
    const warehouseId = warehouseMapping.get(russianName);

    if (!warehouseId) {
      // Skip unknown warehouses — same behaviour as legacy route
      continue;
    }

    const goods = byWarehouse.get(warehouseId) || [];
    goods.push({
      goodName: item.supplierArticle,
      brand: item.brandName || '',
      subject: item.subjectName || '',
      supplierArticle: item.supplierArticle,
      quantity: item.quantity,
    });
    byWarehouse.set(warehouseId, goods);
  }

  return Array.from(byWarehouse.entries()).map(([warehouseId, goods]) => ({
    warehouseId,
    goods,
  }));
}

/**
 * Transform the new official API region-sale response into the legacy
 * RegionSaleData shape ({ salesRows, cursor }).
 *
 * The official service already returns `grouped` with the exact same
 * structure as legacy `salesRows`, so this is a thin wrapper.
 */
export function mapRegionSalesToLegacyFormat(result: {
  grouped: RegionSaleRow[];
  cursor: { limit: number; offset: number; total: number };
}): RegionSaleData {
  return {
    salesRows: result.grouped,
    cursor: result.cursor,
  };
}
