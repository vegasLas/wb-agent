import type { SaleItem, OrderItem } from './wb-orders-official.service';

// ---------------------------------------------------------------------------
// DTO — lean shape exposed to consumers (controllers, AI tools, frontend)
// ---------------------------------------------------------------------------

export interface SaleItemDTO {
  date: string;
  lastChangeDate: string;
  warehouseName: string;
  countryName: string;
  regionName: string;
  supplierArticle: string;
  category: string;
  subject: string;
  brand: string;
  techSize: string;
  isCancel: boolean;
  cancelDate?: string;
  totalPrice: number;
  discountPercent: number;
  spp: number;
  finishedPrice: number;
  priceWithDisc: number;
  forPay: number;
}

// ---------------------------------------------------------------------------
// Aggregated report DTO — groups raw sales into product+warehouse rows
// ---------------------------------------------------------------------------

export interface SalesReportItem {
  brand: string;
  category: string;
  productName: string;
  vendorCode: string;
  size: string;
  warehouse: string;
  orderedQty: number;
  orderedSum: number;
  purchasedQty: number;
  purchasedSum: number;
}

export interface SalesReportData {
  items: SalesReportItem[];
  meta: {
    totalItems: number;
    dateFrom: string;
    dateTo: string;
    generatedAt: string;
  };
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export function toSaleItemDTO(item: SaleItem): SaleItemDTO {
  return {
    date: item.date,
    lastChangeDate: item.lastChangeDate,
    warehouseName: item.warehouseName,
    countryName: item.countryName,
    regionName: item.regionName,
    supplierArticle: item.supplierArticle,
    category: item.category,
    subject: item.subject,
    brand: item.brand,
    techSize: item.techSize,
    isCancel: item.isCancel,
    cancelDate: item.cancelDate,
    totalPrice: item.totalPrice,
    discountPercent: item.discountPercent,
    spp: item.spp,
    finishedPrice: item.finishedPrice,
    priceWithDisc: item.priceWithDisc,
    forPay: item.forPay,
  };
}

export function toSaleItemDTOList(items: SaleItem[]): SaleItemDTO[] {
  return items.map(toSaleItemDTO);
}

/**
 * Aggregate raw SaleItem transactions into product+warehouse report rows.
 *
 * - orderedQty  = total transaction rows (including cancellations)
 * - orderedSum  = sum of finishedPrice for all rows
 * - purchasedQty = rows where isCancel === false
 * - purchasedSum = sum of forPay for non-cancelled rows
 * - stockQty    = 0 (not provided by the Statistics sales endpoint)
 */
export function mapSaleItemsToSalesReportData(
  items: SaleItem[],
  dateFrom: string,
  dateTo: string,
): SalesReportData {
  const grouped = new Map<
    string,
    {
      brand: string;
      category: string;
      subject: string;
      supplierArticle: string;
      techSize: string;
      warehouseName: string;
      orderedQty: number;
      orderedSum: number;
      purchasedQty: number;
      purchasedSum: number;
    }
  >();

  for (const item of items) {
    const key = `${item.supplierArticle}|${item.techSize}|${item.warehouseName}`;

    let group = grouped.get(key);
    if (!group) {
      group = {
        brand: item.brand,
        category: item.category,
        subject: item.subject,
        supplierArticle: item.supplierArticle,
        techSize: item.techSize,
        warehouseName: item.warehouseName,
        orderedQty: 0,
        orderedSum: 0,
        purchasedQty: 0,
        purchasedSum: 0,
      };
      grouped.set(key, group);
    }

    // All rows count toward ordered totals
    group.orderedQty += 1;
    group.orderedSum += item.finishedPrice || 0;

    // Non-cancelled rows count toward purchased totals
    if (!item.isCancel) {
      group.purchasedQty += 1;
      group.purchasedSum += item.forPay || 0;
    }
  }

  const reportItems: SalesReportItem[] = Array.from(grouped.values()).map(
    (g) => ({
      brand: g.brand,
      category: g.category,
      productName: g.subject,
      vendorCode: g.supplierArticle,
      size: g.techSize,
      warehouse: g.warehouseName,
      orderedQty: g.orderedQty,
      orderedSum: Math.round(g.orderedSum * 100) / 100,
      purchasedQty: g.purchasedQty,
      purchasedSum: Math.round(g.purchasedSum * 100) / 100,
    }),
  );

  return {
    items: reportItems,
    meta: {
      totalItems: reportItems.length,
      dateFrom,
      dateTo,
      generatedAt: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Aggregated report DTO — Orders
// ---------------------------------------------------------------------------

export interface OrdersReportItem {
  brand: string;
  category: string;
  productName: string;
  vendorCode: string;
  size: string;
  warehouse: string;
  orderedQty: number;
  orderedSum: number;
  cancelledQty: number;
  cancelledSum: number;
}

export interface OrdersReportData {
  items: OrdersReportItem[];
  meta: {
    totalItems: number;
    dateFrom: string;
    dateTo: string;
    generatedAt: string;
  };
}

/**
 * Aggregate raw OrderItem transactions into product+warehouse report rows.
 *
 * - orderedQty   = total transaction rows
 * - orderedSum   = sum of finishedPrice for all rows
 * - cancelledQty = rows where status indicates cancellation
 * - cancelledSum = sum of finishedPrice for cancelled rows
 */
export function mapOrderItemsToOrdersReportData(
  items: OrderItem[],
  dateFrom: string,
  dateTo: string,
): OrdersReportData {
  const grouped = new Map<
    string,
    {
      brand: string;
      category: string;
      subject: string;
      supplierArticle: string;
      techSize: string;
      warehouseName: string;
      orderedQty: number;
      orderedSum: number;
      cancelledQty: number;
      cancelledSum: number;
    }
  >();

  for (const item of items) {
    const key = `${item.supplierArticle}|${item.techSize}|${item.warehouseName}`;

    let group = grouped.get(key);
    if (!group) {
      group = {
        brand: item.brand,
        category: item.category,
        subject: item.subject,
        supplierArticle: item.supplierArticle,
        techSize: item.techSize,
        warehouseName: item.warehouseName,
        orderedQty: 0,
        orderedSum: 0,
        cancelledQty: 0,
        cancelledSum: 0,
      };
      grouped.set(key, group);
    }

    // All rows count toward ordered totals
    group.orderedQty += 1;
    group.orderedSum += item.finishedPrice || 0;

    // Cancelled rows
    const isCancelled =
      item.status === 'cancel' ||
      item.status === '2' ||
      item.status === 'отмена';

    if (isCancelled) {
      group.cancelledQty += 1;
      group.cancelledSum += item.finishedPrice || 0;
    }
  }

  const reportItems: OrdersReportItem[] = Array.from(grouped.values()).map(
    (g) => ({
      brand: g.brand,
      category: g.category,
      productName: g.subject,
      vendorCode: g.supplierArticle,
      size: g.techSize,
      warehouse: g.warehouseName,
      orderedQty: g.orderedQty,
      orderedSum: Math.round(g.orderedSum * 100) / 100,
      cancelledQty: g.cancelledQty,
      cancelledSum: Math.round(g.cancelledSum * 100) / 100,
    }),
  );

  return {
    items: reportItems,
    meta: {
      totalItems: reportItems.length,
      dateFrom,
      dateTo,
      generatedAt: new Date().toISOString(),
    },
  };
}
