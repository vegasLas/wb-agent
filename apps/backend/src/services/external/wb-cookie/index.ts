/**
 * WB Cookie-based Services
 * All services that use browser cookies for authentication with Wildberries
 */

export { wbCookieAuthService } from './auth.service';
export { wbCookieSupplyService } from './supply.service';
export { wbCookieWarehouseService } from './warehouse.service';
export { wbCookieReportService } from './report.service';
export {
  wbCookiePromotionService,
  getPromotionsTimeline,
  getPromotionDetail,
  getPromotionExcel,
  applyPromotionRecovery,
} from './promotion.service';
export { wbCookieAdvertService } from './advert.service';
export { wbSupplierService } from './supplier.service';
