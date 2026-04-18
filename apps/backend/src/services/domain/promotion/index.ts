// Promotion Domain Services
export {
  getPromotionsTimeline,
  getPromotionDetail,
  getPromotionExcel,
  applyPromotionRecovery,
  type PromotionExcelResult,
  type GetPromotionExcelParams,
} from './promotions.service';

export {
  parsePromotionExcelData,
  PROMOTION_EXCEL_COLUMN_MAP,
  EXCEL_FIELD_TO_CAMEL_CASE,
  type PromotionExcelItem,
  type RawExcelResult,
} from './promotions.mapper';
