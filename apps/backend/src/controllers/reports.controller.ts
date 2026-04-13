/**
 * Reports Controller
 * HTTP request handlers for report endpoints
 */

import { Request, Response } from 'express';
import { getSalesReport } from '@/services/domain/report/report.service';
import { wbExtendedService } from '@/services/external/wb';
import { logger } from '@/utils/logger';

/**
 * GET /api/v1/reports/sales
 * Get sales report for the authenticated user
 * Query params: dateFrom, dateTo (format: DD.MM.YY or YYYY-MM-DD)
 */
export const fetchSalesReport = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    // Get date range from query params
    const { dateFrom, dateTo } = req.query as {
      dateFrom?: string;
      dateTo?: string;
    };

    logger.info(
      `Fetching sales report for user ${userId}, date range: ${dateFrom || 'default'} - ${dateTo || 'default'}`,
    );

    const result = await getSalesReport({
      userId,
      dateFrom,
      dateTo,
    });

    // Return appropriate response based on result
    if (result.error && !result.parsedData) {
      // Error case - but might be pending report
      if (result.reportPending) {
        res.status(202).json({
          success: true,
          data: {
            parsedData: null,
            error: result.error,
            reportPending: true,
            estimatedWaitTime: result.estimatedWaitTime || 30,
          },
        });
        return;
      }

      // Actual error
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    // Success case
    res.status(200).json({
      success: true,
      data: {
        parsedData: result.parsedData,
        error: null,
        reportPending: false,
        estimatedWaitTime: null,
      },
    });
  } catch (error) {
    logger.error('Error in fetchSalesReport controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * GET /api/v1/reports
 * Get user's legacy report data (booking stats)
 * This is kept for backward compatibility
 */
/**
 * POST /api/v1/reports/region-sales
 * Get region sales report for the authenticated user
 * Body: { dateFrom, dateTo, limit?, offset? }
 */
export const fetchRegionSales = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { dateFrom, dateTo, limit, offset } = req.body as {
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    };

    if (!dateFrom || !dateTo) {
      res.status(400).json({
        success: false,
        error: 'dateFrom and dateTo are required',
      });
      return;
    }

    logger.info(
      `Fetching region sales report for user ${userId}, date range: ${dateFrom} - ${dateTo}`,
    );

    const data = await wbExtendedService.getRegionSales({
      userId,
      dateFrom,
      dateTo,
      limit: limit ?? 10,
      offset: offset ?? 0,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in fetchRegionSales controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

export const fetchReport = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    // TODO: Implement legacy report fetching if needed
    // For now, return empty report structure
    res.status(200).json({
      success: true,
      data: {
        id: 0,
        supplierId: 0,
        periodFrom: '',
        periodTo: '',
        data: {
          totalSupplies: 0,
          totalGoods: 0,
          warehouseDistribution: [],
        },
        createdAt: new Date().toISOString(),
        totalBookings: 0,
        bookingsByMonth: [],
        warehouseStats: [],
        coefficientStats: [],
        warehouseSuggestions: [],
      },
    });
  } catch (error) {
    logger.error('Error in fetchReport controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

export default {
  fetchSalesReport,
  fetchRegionSales,
  fetchReport,
};
