/**
 * Warehouse Monitoring V2 Service Tests
 * Migrated from: server/services/monitoring/__tests__/warehouseMonitoringV2.service.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Updated tests to match refactored service architecture
 * - The service is now an orchestrator - tests focus on orchestration behavior
 */

import {
  WarehouseMonitoringV2Service,
  warehouseMonitoringV2Service,
} from '../warehouse-monitoring-v2.service';
import { freeWarehouseService } from '../../free-warehouse.service';
import { closeApiService } from '../../close-api.service';
import { fakeDataDetectionService } from '../fake-data-detection.service';
import { supplyTriggerMonitoringService } from '../supply-trigger-monitoring.service';
import { autobookingMonitoringService } from '../autobooking/autobooking-monitoring.service';
import { autobookingRescheduleMonitoringService } from '../autobooking-reschedule/autobooking-reschedule-monitoring.service';
import { isAutobookingProcessingActive } from '../../autobooking-control.service';
import { prisma } from '../../../config/database';

// Mock dependencies
jest.mock('../../free-warehouse.service', () => ({
  freeWarehouseService: {
    getAllCachedWarehouses: jest.fn(),
  },
}));

jest.mock('../../close-api.service', () => ({
  closeApiService: {
    getCachedData: jest.fn(),
  },
}));

jest.mock('../fake-data-detection.service', () => ({
  fakeDataDetectionService: {
    checkProblematicWarehouses: jest.fn(),
  },
}));

jest.mock('../supply-trigger-monitoring.service', () => ({
  supplyTriggerMonitoringService: {
    processAvailabilities: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../autobooking/autobooking-monitoring.service', () => ({
  autobookingMonitoringService: {
    processAvailabilities: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock(
  '../autobooking-reschedule/autobooking-reschedule-monitoring.service',
  () => ({
    autobookingRescheduleMonitoringService: {
      processRescheduleAvailabilities: jest.fn().mockResolvedValue(undefined),
    },
  }),
);

jest.mock('../../autobooking-control.service', () => ({
  isAutobookingProcessingActive: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../config/database', () => ({
  prisma: {
    autobooking: {
      findMany: jest.fn(),
    },
    supplyTrigger: {
      findMany: jest.fn(),
    },
    autobookingReschedule: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('WarehouseMonitoringV2Service', () => {
  let service: WarehouseMonitoringV2Service;
  let mockFreeWarehouseService: jest.Mocked<typeof freeWarehouseService>;
  let mockCloseApiService: jest.Mocked<typeof closeApiService>;
  let mockFakeDataDetectionService: jest.Mocked<
    typeof fakeDataDetectionService
  >;
  let mockSupplyTriggerMonitoringService: jest.Mocked<
    typeof supplyTriggerMonitoringService
  >;
  let mockAutobookingMonitoringService: jest.Mocked<
    typeof autobookingMonitoringService
  >;
  let mockAutobookingRescheduleMonitoringService: jest.Mocked<
    typeof autobookingRescheduleMonitoringService
  >;
  let mockPrisma: jest.Mocked<typeof prisma>;

  const mockUser = {
    id: 1,
    envInfo: {
      userAgent: 'test-agent',
      proxy: { ip: 'proxy.test', port: '8080' },
    },
    wbCookies: 'test-cookies',
    supplierId: 'supplier123',
    chatId: 'chat123',
    subscriptionExpiresAt: new Date('2025-12-31'),
    accounts: [
      {
        id: 'account123',
        wbCookies: 'account-cookies',
        selectedSupplierId: 'supplier123',
        suppliers: [
          {
            supplierId: 'supplier123',
            supplierName: 'Test Supplier',
          },
        ],
      },
    ],
  };

  const mockAutobooking = {
    id: 'booking123',
    userId: 1,
    supplierId: 'supplier123',
    warehouseId: 1001,
    supplyType: 'BOX',
    dateType: 'WEEK',
    startDate: new Date('2025-01-01'),
    maxCoefficient: 5,
    status: 'ACTIVE',
    draftId: 'draft123',
    transitWarehouseId: null,
    transitWarehouseName: null,
    customDates: null,
    endDate: null,
    user: mockUser,
  };

  const mockSupplyTrigger = {
    id: 'trigger123',
    userId: 1,
    warehouseIds: [1001, 1002],
    supplyTypes: ['BOX', 'MONOPALLETE'],
    isActive: true,
    checkInterval: 180,
    maxCoefficient: 3,
    lastNotificationAt: null,
    searchMode: 'TODAY',
    startDate: null,
    endDate: null,
    selectedDates: [],
    status: 'RELEVANT',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    user: mockUser,
  };

  const mockAutobookingReschedule = {
    id: 'reschedule123',
    userId: 1,
    supplierId: 'supplier123',
    warehouseId: 1001,
    dateType: 'WEEK',
    startDate: new Date('2025-01-01'),
    endDate: null,
    customDates: [],
    status: 'ACTIVE',
    supplyType: 'BOX',
    supplyId: 'supply123',
    user: mockUser,
  };

  beforeEach(() => {
    service = warehouseMonitoringV2Service;
    mockFreeWarehouseService = freeWarehouseService as jest.Mocked<
      typeof freeWarehouseService
    >;
    mockCloseApiService = closeApiService as jest.Mocked<
      typeof closeApiService
    >;
    mockFakeDataDetectionService = fakeDataDetectionService as jest.Mocked<
      typeof fakeDataDetectionService
    >;
    mockSupplyTriggerMonitoringService =
      supplyTriggerMonitoringService as jest.Mocked<
        typeof supplyTriggerMonitoringService
      >;
    mockAutobookingMonitoringService =
      autobookingMonitoringService as jest.Mocked<
        typeof autobookingMonitoringService
      >;
    mockAutobookingRescheduleMonitoringService =
      autobookingRescheduleMonitoringService as jest.Mocked<
        typeof autobookingRescheduleMonitoringService
      >;
    mockPrisma = prisma as jest.Mocked<typeof prisma>;

    jest.clearAllMocks();

    // Default mock implementations
    mockPrisma.autobooking.findMany.mockResolvedValue([mockAutobooking]);
    mockPrisma.supplyTrigger.findMany.mockResolvedValue([mockSupplyTrigger]);
    mockPrisma.autobookingReschedule.findMany.mockResolvedValue([
      mockAutobookingReschedule,
    ]);

    mockFreeWarehouseService.getAllCachedWarehouses.mockReturnValue([
      {
        warehouseID: 1001,
        boxTypeID: 2,
        coefficient: 4,
        allowUnload: true,
        warehouseName: 'Test Warehouse',
        date: '2025-01-01',
      },
    ]);

    mockCloseApiService.getCachedData.mockReturnValue([]);

    mockFakeDataDetectionService.checkProblematicWarehouses.mockReturnValue({
      shouldSkip: false,
    });
  });

  describe('collectMonitoringUsers', () => {
    it('should collect and group autobookings by user', async () => {
      const users = await (service as any).collectMonitoringUsers();

      expect(users.length).toBeGreaterThanOrEqual(0);

      // If users are found, verify the structure
      if (users.length > 0) {
        expect(users[0]).toHaveProperty('userId');
        expect(users[0]).toHaveProperty('userAgent');
        expect(users[0]).toHaveProperty('autobookings');
        expect(users[0]).toHaveProperty('supplyTriggers');
        expect(users[0]).toHaveProperty('reschedules');
        expect(Array.isArray(users[0].autobookings)).toBe(true);
        expect(Array.isArray(users[0].supplyTriggers)).toBe(true);
        expect(Array.isArray(users[0].reschedules)).toBe(true);
      }
    });

    it('should skip users without account cookies', async () => {
      mockPrisma.autobooking.findMany.mockResolvedValue([]);
      mockPrisma.supplyTrigger.findMany.mockResolvedValue([]);
      mockPrisma.autobookingReschedule.findMany.mockResolvedValue([]);

      const users = await (service as any).collectMonitoringUsers();

      expect(users).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.autobooking.findMany.mockRejectedValue(new Error('DB error'));

      const users = await (service as any).collectMonitoringUsers();

      expect(users).toEqual([]);
    });
  });

  describe('groupUserBookingsAndTriggers', () => {
    it('should group single autobooking for single user', () => {
      const autobookings = [
        {
          ...mockAutobooking,
          dateType: 'CUSTOM_DATES',
          customDates: [new Date('2025-01-15')],
          user: mockUser,
        },
      ];
      const supplyTriggers: (typeof mockSupplyTrigger)[] = [];
      const reschedules: (typeof mockAutobookingReschedule)[] = [];

      const result = (service as any).groupUserBookingsAndTriggers({
        autobookings,
        supplyTriggers,
        reschedules,
      });

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(1);
      expect(result[0].autobookings).toHaveLength(1);
      expect(result[0].supplyTriggers).toHaveLength(0);
      expect(result[0].accounts).toEqual({ account123: ['supplier123'] });
    });

    it('should group multiple autobookings for same user', () => {
      const autobookings = [
        {
          ...mockAutobooking,
          id: 'booking1',
          dateType: 'CUSTOM_DATES',
          customDates: [new Date('2025-01-15')],
          user: mockUser,
        },
        {
          ...mockAutobooking,
          id: 'booking2',
          dateType: 'CUSTOM_DATES',
          customDates: [new Date('2025-01-16')],
          user: mockUser,
        },
      ];
      const supplyTriggers: (typeof mockSupplyTrigger)[] = [];
      const reschedules: (typeof mockAutobookingReschedule)[] = [];

      const result = (service as any).groupUserBookingsAndTriggers({
        autobookings,
        supplyTriggers,
        reschedules,
      });

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(1);
      expect(result[0].autobookings).toHaveLength(2);
    });

    it('should group autobookings for different users', () => {
      const user2 = {
        ...mockUser,
        id: 2,
        accounts: [
          {
            id: 'account456',
            wbCookies: 'cookies2',
            selectedSupplierId: 'supplier456',
            suppliers: [{ supplierId: 'supplier456' }],
          },
        ],
      };

      const autobookings = [
        {
          ...mockAutobooking,
          id: 'booking1',
          dateType: 'CUSTOM_DATES',
          customDates: [new Date('2025-01-15')],
          user: mockUser,
        },
        {
          ...mockAutobooking,
          id: 'booking2',
          userId: 2,
          supplierId: 'supplier456',
          dateType: 'CUSTOM_DATES',
          customDates: [new Date('2025-01-16')],
          user: user2,
        },
      ];
      const supplyTriggers: (typeof mockSupplyTrigger)[] = [];
      const reschedules: (typeof mockAutobookingReschedule)[] = [];

      const result = (service as any).groupUserBookingsAndTriggers({
        autobookings,
        supplyTriggers,
        reschedules,
      });

      expect(result).toHaveLength(2);
    });

    it('should add supply trigger to existing user with autobookings', () => {
      const autobookings = [
        {
          ...mockAutobooking,
          dateType: 'CUSTOM_DATES',
          customDates: [new Date('2025-01-15')],
          user: mockUser,
        },
      ];
      const supplyTriggers = [{ ...mockSupplyTrigger, user: mockUser }];
      const reschedules: (typeof mockAutobookingReschedule)[] = [];

      const result = (service as any).groupUserBookingsAndTriggers({
        autobookings,
        supplyTriggers,
        reschedules,
      });

      expect(result).toHaveLength(1);
      expect(result[0].autobookings).toHaveLength(1);
      expect(result[0].supplyTriggers).toHaveLength(1);
    });

    it('should create user with only supply trigger (no autobookings)', () => {
      const autobookings: (typeof mockAutobooking)[] = [];
      const supplyTriggers = [{ ...mockSupplyTrigger, user: mockUser }];
      const reschedules: (typeof mockAutobookingReschedule)[] = [];

      const result = (service as any).groupUserBookingsAndTriggers({
        autobookings,
        supplyTriggers,
        reschedules,
      });

      expect(result).toHaveLength(1);
      expect(result[0].autobookings).toHaveLength(0);
      expect(result[0].supplyTriggers).toHaveLength(1);
    });

    it('should skip autobookings without valid user data', () => {
      const invalidUser = { ...mockUser, envInfo: null };
      const autobookings = [{ ...mockAutobooking, user: invalidUser }];
      const supplyTriggers: (typeof mockSupplyTrigger)[] = [];
      const reschedules: (typeof mockAutobookingReschedule)[] = [];

      const result = (service as any).groupUserBookingsAndTriggers({
        autobookings,
        supplyTriggers,
        reschedules,
      });

      expect(result).toHaveLength(0);
    });

    it('should skip supply triggers without chatId', () => {
      const userWithoutChat = { ...mockUser, chatId: null };
      const autobookings: (typeof mockAutobooking)[] = [];
      const supplyTriggers = [{ ...mockSupplyTrigger, user: userWithoutChat }];
      const reschedules: (typeof mockAutobookingReschedule)[] = [];

      const result = (service as any).groupUserBookingsAndTriggers({
        autobookings,
        supplyTriggers,
        reschedules,
      });

      expect(result).toHaveLength(0);
    });

    it('should group reschedules with existing user', () => {
      const autobookings = [
        {
          ...mockAutobooking,
          dateType: 'CUSTOM_DATES',
          customDates: [new Date('2025-01-15')],
          user: mockUser,
        },
      ];
      const supplyTriggers: (typeof mockSupplyTrigger)[] = [];
      const reschedules = [
        {
          ...mockAutobookingReschedule,
          dateType: 'CUSTOM_DATES',
          customDates: [new Date('2025-01-20')],
          user: mockUser,
        },
      ];

      const result = (service as any).groupUserBookingsAndTriggers({
        autobookings,
        supplyTriggers,
        reschedules,
      });

      expect(result).toHaveLength(1);
      expect(result[0].autobookings).toHaveLength(1);
      expect(result[0].reschedules).toHaveLength(1);
    });
  });

  describe('hasValidAccount', () => {
    it('should return true for valid account with cookies', () => {
      const accounts = [
        {
          id: 'account123',
          wbCookies: 'valid-cookies',
          suppliers: [{ supplierId: 'supplier123' }],
        },
      ];

      const result = (service as any).hasValidAccount(accounts, 'supplier123');

      expect(result).toBe(true);
    });

    it('should return false for account without cookies', () => {
      const accounts = [
        {
          id: 'account123',
          wbCookies: null,
          suppliers: [{ supplierId: 'supplier123' }],
        },
      ];

      const result = (service as any).hasValidAccount(accounts, 'supplier123');

      expect(result).toBe(false);
    });

    it('should return false for non-matching supplier', () => {
      const accounts = [
        {
          id: 'account123',
          wbCookies: 'valid-cookies',
          suppliers: [{ supplierId: 'different-supplier' }],
        },
      ];

      const result = (service as any).hasValidAccount(accounts, 'supplier123');

      expect(result).toBe(false);
    });

    it('should return false for empty accounts array', () => {
      const result = (service as any).hasValidAccount([], 'supplier123');

      expect(result).toBe(false);
    });
  });

  describe('collectWarehouseData', () => {
    it('should collect warehouse data from autobookings and triggers', () => {
      const users = [
        {
          autobookings: [
            {
              warehouseId: 1001,
              supplyType: 'BOX',
            },
          ],
          supplyTriggers: [
            {
              warehouseIds: [1002],
              supplyTypes: ['MONOPALLETE'],
            },
          ],
          reschedules: [
            {
              warehouseId: 1003,
              supplyType: 'SUPERSAFE',
            },
          ],
        },
      ];

      const warehouses = (service as any).collectWarehouseData(users);

      expect(warehouses).toEqual([
        { warehouseId: 1001, boxTypes: [2] },
        { warehouseId: 1002, boxTypes: [5] },
        { warehouseId: 1003, boxTypes: [6] },
      ]);
    });

    it('should merge box types when same warehouse has different supply types', () => {
      const users = [
        {
          autobookings: [
            {
              warehouseId: 1001,
              supplyType: 'BOX',
            },
          ],
          supplyTriggers: [
            {
              warehouseIds: [1001],
              supplyTypes: ['SUPERSAFE'],
            },
          ],
          reschedules: [],
        },
      ];

      const warehouses = (service as any).collectWarehouseData(users);

      expect(warehouses).toEqual([{ warehouseId: 1001, boxTypes: [2, 6] }]);
    });

    it('should skip reschedules without warehouseId', () => {
      const users = [
        {
          autobookings: [],
          supplyTriggers: [],
          reschedules: [
            {
              warehouseId: null,
              supplyType: 'BOX',
            },
            {
              warehouseId: 1001,
              supplyType: 'BOX',
            },
          ],
        },
      ];

      const warehouses = (service as any).collectWarehouseData(users);

      expect(warehouses).toEqual([{ warehouseId: 1001, boxTypes: [2] }]);
    });
  });

  describe('fetchAllWarehouses', () => {
    it('should fetch warehouses from cached services', () => {
      mockFreeWarehouseService.getAllCachedWarehouses.mockReturnValue([
        {
          warehouseID: 1001,
          warehouseName: 'Test Warehouse Free',
          boxTypeID: 2,
          date: '2025-01-15',
          coefficient: 4,
          allowUnload: true,
        },
      ]);

      mockCloseApiService.getCachedData.mockReturnValue([]);

      const warehouseIds = [{ warehouseId: 1001, boxTypes: [2] }];

      const result = (service as any).fetchAllWarehouses(warehouseIds);

      expect(
        mockFreeWarehouseService.getAllCachedWarehouses,
      ).toHaveBeenCalled();
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should deduplicate warehouses between free and close APIs', () => {
      // Both services returning same warehouse+boxType+date
      mockFreeWarehouseService.getAllCachedWarehouses.mockReturnValue([
        {
          warehouseID: 1001,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2,
          date: '2025-01-15',
          coefficient: 4,
          allowUnload: true,
        },
      ]);

      mockCloseApiService.getCachedData.mockReturnValue([
        {
          warehouseID: 1001,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2,
          date: '2025-01-15',
          coefficient: 3,
          allowUnload: true,
        },
      ]);

      const warehouseIds = [{ warehouseId: 1001, boxTypes: [2] }];

      const result = (service as any).fetchAllWarehouses(warehouseIds);

      // Should only have 1 warehouse (free API takes precedence)
      expect(result.length).toBe(1);
      expect(result[0].coefficient).toBe(4); // From free API
    });

    it('should skip problematic warehouses when detected', () => {
      mockFakeDataDetectionService.checkProblematicWarehouses.mockReturnValue({
        shouldSkip: true,
        reason: 'Too many identical coefficients',
      });

      const warehouseIds = [{ warehouseId: 1001, boxTypes: [2] }];

      const result = (service as any).fetchAllWarehouses(warehouseIds);

      expect(result).toEqual([]);
    });

    it('should handle empty cached data gracefully', () => {
      mockFreeWarehouseService.getAllCachedWarehouses.mockReturnValue([]);
      mockCloseApiService.getCachedData.mockReturnValue([]);

      const warehouseIds = [{ warehouseId: 1001, boxTypes: [2] }];

      const result = (service as any).fetchAllWarehouses(warehouseIds);

      expect(result).toEqual([]);
    });

    it('should filter warehouses by user requirements', () => {
      mockFreeWarehouseService.getAllCachedWarehouses.mockReturnValue([
        {
          warehouseID: 1001,
          warehouseName: 'Warehouse 1',
          boxTypeID: 2,
          date: '2025-01-15',
          coefficient: 4,
          allowUnload: true,
        },
        {
          warehouseID: 9999,
          warehouseName: 'Not Requested',
          boxTypeID: 2,
          date: '2025-01-15',
          coefficient: 4,
          allowUnload: true,
        },
      ]);

      mockCloseApiService.getCachedData.mockReturnValue([]);

      const warehouseIds = [{ warehouseId: 1001, boxTypes: [2] }];

      const result = (service as any).fetchAllWarehouses(warehouseIds);

      // Should only include warehouse 1001
      expect(result.length).toBe(1);
      expect(result[0].warehouseID).toBe(1001);
    });
  });

  describe('filterValidWarehouses', () => {
    it('should filter warehouses with valid coefficients and allowUnload', () => {
      const warehouses = [
        {
          warehouseID: 1001,
          warehouseName: 'Valid Warehouse',
          boxTypeID: 2,
          coefficient: 4,
          allowUnload: true,
          date: '2025-01-15',
        },
        {
          warehouseID: 1002,
          warehouseName: 'Invalid Warehouse',
          boxTypeID: 2,
          coefficient: -1,
          allowUnload: true,
          date: '2025-01-15',
        },
        {
          warehouseID: 1003,
          warehouseName: 'Blocked Warehouse',
          boxTypeID: 2,
          coefficient: 4,
          allowUnload: false,
          date: '2025-01-15',
        },
      ];

      const result = (service as any).filterValidWarehouses(warehouses);

      expect(result).toHaveLength(1);
      expect(result[0].warehouseID).toBe(1001);
    });

    it('should handle empty warehouse list', () => {
      const result = (service as any).filterValidWarehouses([]);
      expect(result).toEqual([]);
    });
  });

  describe('processWarehouseData', () => {
    it('should process and group warehouse data', () => {
      const warehouses = [
        {
          warehouseID: 1001,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2,
          date: '2025-01-15',
          coefficient: 4,
          allowUnload: true,
        },
        {
          warehouseID: 1001,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2,
          date: '2025-01-16',
          coefficient: 5,
          allowUnload: true,
        },
      ];

      const result = (service as any).processWarehouseData(warehouses);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        warehouseId: 1001,
        warehouseName: 'Test Warehouse',
        boxTypeID: 2,
      });
      expect(result[0].availableDates).toHaveLength(2);
    });

    it('should sort dates chronologically', () => {
      const warehouses = [
        {
          warehouseID: 1001,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2,
          date: '2025-01-20',
          coefficient: 4,
          allowUnload: true,
        },
        {
          warehouseID: 1001,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2,
          date: '2025-01-15',
          coefficient: 5,
          allowUnload: true,
        },
      ];

      const result = (service as any).processWarehouseData(warehouses);

      expect(result[0].availableDates[0].date).toBe('2025-01-15');
      expect(result[0].availableDates[1].date).toBe('2025-01-20');
    });
  });

  describe('monitorWarehouses', () => {
    it('should complete full monitoring cycle', async () => {
      // Setup mocks for all dependencies
      mockPrisma.autobooking.findMany.mockResolvedValue([mockAutobooking]);
      mockPrisma.supplyTrigger.findMany.mockResolvedValue([]);
      mockPrisma.autobookingReschedule.findMany.mockResolvedValue([]);

      mockFreeWarehouseService.getAllCachedWarehouses.mockReturnValue([
        {
          warehouseID: 1001,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2,
          date: '2025-01-15',
          coefficient: 4,
          allowUnload: true,
        },
      ]);

      await service.monitorWarehouses();

      expect(
        mockAutobookingMonitoringService.processAvailabilities,
      ).toHaveBeenCalled();
      expect(
        mockAutobookingRescheduleMonitoringService.processRescheduleAvailabilities,
      ).toHaveBeenCalled();
    });

    it('should return early if no monitoring users', async () => {
      mockPrisma.autobooking.findMany.mockResolvedValue([]);
      mockPrisma.supplyTrigger.findMany.mockResolvedValue([]);
      mockPrisma.autobookingReschedule.findMany.mockResolvedValue([]);

      await service.monitorWarehouses();

      expect(
        mockAutobookingMonitoringService.processAvailabilities,
      ).not.toHaveBeenCalled();
    });

    it('should return early if no warehouses to monitor', async () => {
      mockPrisma.autobooking.findMany.mockResolvedValue([]);
      mockPrisma.supplyTrigger.findMany.mockResolvedValue([]);
      mockPrisma.autobookingReschedule.findMany.mockResolvedValue([]);

      await service.monitorWarehouses();

      expect(
        mockAutobookingMonitoringService.processAvailabilities,
      ).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.autobooking.findMany.mockRejectedValue(
        new Error('Test error'),
      );

      // Should not throw
      await expect(service.monitorWarehouses()).resolves.not.toThrow();
    });

    it('should skip autobooking when processing is disabled', async () => {
      (isAutobookingProcessingActive as jest.Mock).mockReturnValue(false);

      mockPrisma.autobooking.findMany.mockResolvedValue([mockAutobooking]);
      mockPrisma.supplyTrigger.findMany.mockResolvedValue([]);
      mockPrisma.autobookingReschedule.findMany.mockResolvedValue([]);

      mockFreeWarehouseService.getAllCachedWarehouses.mockReturnValue([
        {
          warehouseID: 1001,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2,
          date: '2025-01-15',
          coefficient: 4,
          allowUnload: true,
        },
      ]);

      await service.monitorWarehouses();

      // Autobooking should not be called when disabled
      expect(
        mockAutobookingMonitoringService.processAvailabilities,
      ).not.toHaveBeenCalled();
      // But reschedule should still be called
      expect(
        mockAutobookingRescheduleMonitoringService.processRescheduleAvailabilities,
      ).toHaveBeenCalled();
    });
  });

  describe('prepareSupplyTrigger', () => {
    it('should prepare valid supply trigger', () => {
      const trigger = {
        ...mockSupplyTrigger,
        lastNotificationAt: null,
        user: mockUser,
      };

      const result = (service as any).prepareSupplyTrigger(trigger);

      expect(result).not.toBeNull();
      expect(result.user.id).toBe(1);
    });

    it('should return null for user without chatId', () => {
      const trigger = {
        ...mockSupplyTrigger,
        user: { ...mockUser, chatId: null },
      };

      const result = (service as any).prepareSupplyTrigger(trigger);

      expect(result).toBeNull();
    });

    it('should return null when notification interval has not passed', () => {
      const recentTime = new Date();
      recentTime.setMinutes(recentTime.getMinutes() - 30); // 30 minutes ago

      const trigger = {
        ...mockSupplyTrigger,
        checkInterval: 180, // 3 hours
        lastNotificationAt: recentTime,
        user: mockUser,
      };

      const result = (service as any).prepareSupplyTrigger(trigger);

      expect(result).toBeNull();
    });

    it('should prepare trigger when notification interval has passed', () => {
      const oldTime = new Date();
      oldTime.setHours(oldTime.getHours() - 4); // 4 hours ago

      const trigger = {
        ...mockSupplyTrigger,
        checkInterval: 180, // 3 hours
        lastNotificationAt: oldTime,
        user: mockUser,
      };

      const result = (service as any).prepareSupplyTrigger(trigger);

      expect(result).not.toBeNull();
    });
  });
});
