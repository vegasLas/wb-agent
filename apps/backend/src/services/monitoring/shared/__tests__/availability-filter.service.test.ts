/**
 * Availability Filter Service Tests
 * Phase 3: Availability Filtering
 */

import {
  SharedAvailabilityFilterService,
  sharedAvailabilityFilterService,
} from '@/services/monitoring/shared/availability-filter.service';
import type {
  SchedulableItem,
  WarehouseAvailability,
} from '@/services/monitoring/shared/interfaces/sharedInterfaces';

// Mock the ban service - Jest style
jest.mock('../ban.service', () => ({
  sharedBanService: {
    isBanned: jest.fn(),
  },
}));

// Import after mock
import { sharedBanService } from '@/services/monitoring/shared/ban.service';

const mockedIsBanned = sharedBanService.isBanned as jest.MockedFunction<
  typeof sharedBanService.isBanned
>;

describe('SharedAvailabilityFilterService', () => {
  let service: SharedAvailabilityFilterService;

  // Test fixtures
  const createTestAvailabilities = (): WarehouseAvailability[] => [
    {
      warehouseId: 1,
      warehouseName: 'Warehouse 1',
      boxTypeID: 2,
      availableDates: [
        { date: '2024-01-15', coefficient: 1.5 },
        { date: '2024-01-16', coefficient: 2.0 },
        { date: '2024-01-17', coefficient: 0.5 },
      ],
    },
    {
      warehouseId: 1,
      warehouseName: 'Warehouse 1',
      boxTypeID: 5,
      availableDates: [
        { date: '2024-01-15', coefficient: 3.0 },
        { date: '2024-01-18', coefficient: 1.0 },
      ],
    },
    {
      warehouseId: 2,
      warehouseName: 'Warehouse 2',
      boxTypeID: 2,
      availableDates: [{ date: '2024-01-15', coefficient: 2.5 }],
    },
  ];

  const createTestBooking = (
    overrides: Partial<SchedulableItem> = {},
  ): SchedulableItem => ({
    id: 'booking-1',
    userId: 1,
    supplierId: 'supplier-1',
    draftId: 'draft-1',
    warehouseId: 1,
    transitWarehouseId: null,
    supplyType: 'BOX',
    transitWarehouseName: null,
    monopalletCount: null,
    dateType: 'CUSTOM_DATES',
    startDate: null,
    endDate: null,
    customDates: [new Date('2024-01-15'), new Date('2024-01-16')],
    completedDates: [],
    maxCoefficient: 2.0,
    status: 'ACTIVE',
    supplyId: null,
    supplyIdUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    // Set a fixed date for testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-10T10:00:00Z'));

    service = new SharedAvailabilityFilterService();
    mockedIsBanned.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(sharedAvailabilityFilterService).toBeInstanceOf(
        SharedAvailabilityFilterService,
      );
    });

    it('should maintain consistent behavior across accesses', () => {
      const instance1 = sharedAvailabilityFilterService;
      const instance2 = sharedAvailabilityFilterService;
      expect(instance1).toBe(instance2);
    });
  });

  describe('filterMatchingAvailabilities', () => {
    it('should return empty array for empty availabilities', () => {
      const booking = createTestBooking();
      const result = service.filterMatchingAvailabilities(booking, []);
      expect(result).toEqual([]);
    });

    it('should filter by warehouse ID', () => {
      const booking = createTestBooking({
        warehouseId: 2,
        customDates: [new Date('2024-01-15')],
        maxCoefficient: 3.0,
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].availability.warehouseId).toBe(2);
      expect(result[0].matchingDates).toHaveLength(1);
    });

    it('should filter by supply type (box type)', () => {
      const booking = createTestBooking({
        supplyType: 'MONOPALLETE',
        customDates: [new Date('2024-01-15'), new Date('2024-01-18')],
        maxCoefficient: 4.0,
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].availability.boxTypeID).toBe(5);
      expect(result[0].matchingDates).toHaveLength(2);
    });

    it('should return matching dates for CUSTOM_DATES', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_DATES',
        customDates: [new Date('2024-01-15'), new Date('2024-01-16')],
        maxCoefficient: 2.0,
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(2);

      const dates = result[0].matchingDates.map((m) =>
        m.effectiveDate.toDateString(),
      );
      expect(dates).toContain('Mon Jan 15 2024');
      expect(dates).toContain('Tue Jan 16 2024');
    });

    it('should respect maxCoefficient for autobookings', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_DATES',
        customDates: [new Date('2024-01-15'), new Date('2024-01-16')],
        maxCoefficient: 1.7,
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(1);
      expect(result[0].matchingDates[0].availableDate.coefficient).toBe(1.5);
    });

    it('should exclude completed dates', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_DATES',
        customDates: [new Date('2024-01-15'), new Date('2024-01-16')],
        completedDates: [new Date('2024-01-15')],
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(1);
      expect(result[0].matchingDates[0].effectiveDate.toDateString()).toBe(
        'Tue Jan 16 2024',
      );
    });

    it('should exclude banned dates', () => {
      mockedIsBanned.mockImplementation(({ date }) => {
        return date?.toDateString() === 'Mon Jan 15 2024';
      });

      const booking = createTestBooking({
        dateType: 'CUSTOM_DATES',
        customDates: [new Date('2024-01-15'), new Date('2024-01-16')],
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(1);
      expect(result[0].matchingDates[0].effectiveDate.toDateString()).toBe(
        'Tue Jan 16 2024',
      );
    });

    it('should handle WEEK date type', () => {
      const startDate = new Date('2024-01-15');
      const booking = createTestBooking({
        dateType: 'WEEK',
        startDate,
        endDate: null,
        customDates: [],
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates.length).toBeGreaterThan(0);

      const matchingDates = result[0].matchingDates.map((m) =>
        m.effectiveDate.toDateString(),
      );
      expect(matchingDates).toContain('Mon Jan 15 2024');
      expect(matchingDates).toContain('Tue Jan 16 2024');
      expect(matchingDates).toContain('Wed Jan 17 2024');
    });

    it('should handle MONTH date type', () => {
      const startDate = new Date('2024-01-15');
      const booking = createTestBooking({
        dateType: 'MONTH',
        startDate,
        endDate: null,
        customDates: [],
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates.length).toBeGreaterThan(0);
    });

    it('should handle CUSTOM_PERIOD date type', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_PERIOD',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        customDates: [],
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates.length).toBe(3);
    });

    it('should handle CUSTOM_DATES_SINGLE date type like CUSTOM_DATES', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_DATES_SINGLE',
        customDates: [new Date('2024-01-15'), new Date('2024-01-16')],
        maxCoefficient: 2.0,
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(2);

      const dates = result[0].matchingDates.map((m) =>
        m.effectiveDate.toDateString(),
      );
      expect(dates).toContain('Mon Jan 15 2024');
      expect(dates).toContain('Tue Jan 16 2024');
    });
  });

  describe('unified filtering for autobookings', () => {
    it('should filter autobookings using generic method with maxCoefficient validation', () => {
      const autobooking = createTestBooking({
        maxCoefficient: 1.7,
        customDates: [new Date('2024-01-15'), new Date('2024-01-16')],
      });
      const availabilities = createTestAvailabilities();

      const genericItem = service.convertToSchedulableItem(autobooking as any);
      const result = service.filterMatchingAvailabilities(
        genericItem,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(1);
      expect(result[0].matchingDates[0].availableDate.coefficient).toBe(1.5);
    });

    it('should preserve maxCoefficient in conversion', () => {
      const autobooking = createTestBooking({ maxCoefficient: 1.0 }) as any;
      const converted = service.convertToSchedulableItem(autobooking);
      expect(converted.maxCoefficient).toBe(1.0);
    });
  });

  describe('unified filtering for reschedules', () => {
    it('should filter reschedules using generic method with maxCoefficient validation', () => {
      const reschedule = createTestBooking({
        maxCoefficient: 0.6,
        customDates: [
          new Date('2024-01-15'),
          new Date('2024-01-16'),
          new Date('2024-01-17'),
        ],
      });
      const availabilities = createTestAvailabilities();

      const genericItem = service.convertToSchedulableItem(reschedule as any);
      const result = service.filterMatchingAvailabilities(
        genericItem,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(1);
      expect(result[0].matchingDates[0].availableDate.coefficient).toBe(0.5);
    });

    it('should preserve maxCoefficient for reschedule filtering', () => {
      const reschedule = createTestBooking({ maxCoefficient: 1.0 }) as any;
      const converted = service.convertToSchedulableItem(reschedule);
      expect(converted.maxCoefficient).toBe(1.0);
    });
  });

  describe('convertToSchedulableItem', () => {
    it('should convert booking items with all properties', () => {
      const booking = createTestBooking() as any;
      const result = service.convertToSchedulableItem(booking);

      expect(result).toMatchObject({
        id: 'booking-1',
        userId: 1,
        supplierId: 'supplier-1',
        warehouseId: 1,
        supplyType: 'BOX',
        dateType: 'CUSTOM_DATES',
        maxCoefficient: 2.0,
      });
    });

    it('should handle missing optional properties', () => {
      const booking = {
        ...createTestBooking(),
        customDates: undefined,
        completedDates: undefined,
      };
      const result = service.convertToSchedulableItem(booking as any);

      expect(result.customDates).toEqual([]);
      expect(result.completedDates).toEqual([]);
    });

    it('should preserve effectiveDates when present', () => {
      const booking = {
        ...createTestBooking(),
        effectiveDates: [new Date('2024-01-20'), new Date('2024-01-21')],
      };
      const result = service.convertToSchedulableItem(booking as any);

      expect(result.effectiveDates).toEqual([
        new Date('2024-01-20'),
        new Date('2024-01-21'),
      ]);
    });

    it('should preserve currentDate when present', () => {
      const currentDate = new Date('2024-01-16');
      const booking = {
        ...createTestBooking(),
        currentDate: currentDate,
      };
      const result = service.convertToSchedulableItem(booking as any);
      expect(result.currentDate).toEqual(currentDate);
    });
  });

  describe('box type mapping', () => {
    it('should map BOX to boxTypeID 2', () => {
      const booking = createTestBooking({ supplyType: 'BOX' });
      const availabilities = [
        {
          warehouseId: 1,
          warehouseName: 'Test',
          boxTypeID: 2 as const,
          availableDates: [{ date: '2024-01-15', coefficient: 1.0 }],
        },
      ];
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );
      expect(result).toHaveLength(1);
    });

    it('should map MONOPALLETE to boxTypeID 5', () => {
      const booking = createTestBooking({ supplyType: 'MONOPALLETE' });
      const availabilities = [
        {
          warehouseId: 1,
          warehouseName: 'Test',
          boxTypeID: 5 as const,
          availableDates: [{ date: '2024-01-15', coefficient: 1.0 }],
        },
      ];
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );
      expect(result).toHaveLength(1);
    });

    it('should map SUPERSAFE to boxTypeID 6', () => {
      const booking = createTestBooking({ supplyType: 'SUPERSAFE' });
      const availabilities = [
        {
          warehouseId: 1,
          warehouseName: 'Test',
          boxTypeID: 6 as const,
          availableDates: [{ date: '2024-01-15', coefficient: 1.0 }],
        },
      ];
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );
      expect(result).toHaveLength(1);
    });

    it('should default unknown supply types to boxTypeID 2', () => {
      const booking = createTestBooking({ supplyType: 'UNKNOWN_TYPE' });
      const availabilities = [
        {
          warehouseId: 1,
          warehouseName: 'Test',
          boxTypeID: 2 as const,
          availableDates: [{ date: '2024-01-15', coefficient: 1.0 }],
        },
      ];
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('date range generation', () => {
    it('should generate correct WEEK date range', () => {
      const booking = createTestBooking({
        dateType: 'WEEK',
        startDate: new Date('2024-01-15'),
        customDates: [],
      });
      const availabilities = [
        {
          warehouseId: 1,
          warehouseName: 'Test',
          boxTypeID: 2 as const,
          availableDates: [
            { date: '2024-01-15', coefficient: 1.0 },
            { date: '2024-01-16', coefficient: 1.0 },
            { date: '2024-01-17', coefficient: 1.0 },
            { date: '2024-01-21', coefficient: 1.0 },
          ],
        },
      ];
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );
      expect(result[0].matchingDates).toHaveLength(4);
    });

    it('should generate correct MONTH date range', () => {
      const booking = createTestBooking({
        dateType: 'MONTH',
        startDate: new Date('2024-01-15'),
        customDates: [],
      });
      const availabilities = [
        {
          warehouseId: 1,
          warehouseName: 'Test',
          boxTypeID: 2 as const,
          availableDates: [
            { date: '2024-01-15', coefficient: 1.0 },
            { date: '2024-02-10', coefficient: 1.0 },
            { date: '2024-02-15', coefficient: 1.0 },
          ],
        },
      ];
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );
      expect(result[0].matchingDates).toHaveLength(2);
    });

    it('should handle CUSTOM_PERIOD correctly', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_PERIOD',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        customDates: [],
      });
      const availabilities = [
        {
          warehouseId: 1,
          warehouseName: 'Test',
          boxTypeID: 2 as const,
          availableDates: [
            { date: '2024-01-14', coefficient: 1.0 },
            { date: '2024-01-15', coefficient: 1.0 },
            { date: '2024-01-16', coefficient: 1.0 },
            { date: '2024-01-17', coefficient: 1.0 },
            { date: '2024-01-18', coefficient: 1.0 },
          ],
        },
      ];
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );
      expect(result[0].matchingDates).toHaveLength(3);
    });

    it('should filter out past dates', () => {
      const booking = createTestBooking({
        dateType: 'WEEK',
        startDate: new Date('2024-01-05'),
        customDates: [],
      });
      const availabilities = [
        {
          warehouseId: 1,
          warehouseName: 'Test',
          boxTypeID: 2 as const,
          availableDates: [
            { date: '2024-01-05', coefficient: 1.0 },
            { date: '2024-01-11', coefficient: 1.0 },
          ],
        },
      ];
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );
      expect(result[0].matchingDates).toHaveLength(1);
      expect(result[0].matchingDates[0].effectiveDate.toDateString()).toBe(
        'Thu Jan 11 2024',
      );
    });
  });

  describe('ban checking integration', () => {
    it('should call ban service with correct parameters', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_DATES',
        warehouseId: 1,
        supplyType: 'BOX',
        customDates: [new Date('2024-01-15')],
      });
      const availabilities = createTestAvailabilities();
      service.filterMatchingAvailabilities(booking, availabilities);

      expect(mockedIsBanned).toHaveBeenCalledWith({
        warehouseId: 1,
        date: expect.any(Date),
        supplyType: 'BOX',
        coefficient: expect.any(Number),
      });
    });

    it('should handle completed dates and ban service interaction', () => {
      mockedIsBanned.mockImplementation(({ date }) => {
        return date?.toDateString() === 'Tue Jan 16 2024';
      });

      const booking = createTestBooking({
        dateType: 'CUSTOM_DATES',
        customDates: [
          new Date('2024-01-15'),
          new Date('2024-01-16'),
          new Date('2024-01-17'),
        ],
        completedDates: [new Date('2024-01-17')],
      });
      const availabilities = createTestAvailabilities();

      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(1);
      expect(result[0].matchingDates[0].effectiveDate.toDateString()).toBe(
        'Mon Jan 15 2024',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty custom dates', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_DATES',
        customDates: [],
        completedDates: [],
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );
      expect(result).toEqual([]);
    });

    it('should handle missing start date for WEEK', () => {
      const booking = createTestBooking({
        dateType: 'WEEK',
        startDate: null,
        customDates: [],
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );
      expect(result).toEqual([]);
    });

    it('should handle missing start date for MONTH', () => {
      const booking = createTestBooking({
        dateType: 'MONTH',
        startDate: null,
        customDates: [],
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );
      expect(result).toEqual([]);
    });

    it('should handle missing dates for CUSTOM_PERIOD', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_PERIOD',
        startDate: null,
        endDate: null,
        customDates: [],
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );
      expect(result).toEqual([]);
    });

    it('should handle unknown date types', () => {
      const booking = createTestBooking({
        dateType: 'UNKNOWN_TYPE' as any,
        customDates: [],
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );
      expect(result).toEqual([]);
    });

    it('should handle zero maxCoefficient', () => {
      const booking = createTestBooking({
        maxCoefficient: 0,
        customDates: [new Date('2024-01-17')],
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );
      expect(result).toEqual([]);
    });

    it('should handle availability with empty availableDates', () => {
      const booking = createTestBooking();
      const availabilities = [
        {
          warehouseId: 1,
          warehouseName: 'Test',
          boxTypeID: 2 as const,
          availableDates: [],
        },
      ];
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );
      expect(result).toEqual([]);
    });
  });

  describe('currentDate exclusion logic', () => {
    it('should exclude currentDate from CUSTOM_DATES_SINGLE processing', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_DATES_SINGLE',
        customDates: [
          new Date('2024-01-15'),
          new Date('2024-01-16'),
          new Date('2024-01-17'),
        ],
        currentDate: new Date('2024-01-16'),
        maxCoefficient: 10,
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(2);

      const effectiveDates = result[0].matchingDates.map((m) =>
        m.effectiveDate.toDateString(),
      );
      expect(effectiveDates).not.toContain('Tue Jan 16 2024');
    });

    it('should exclude currentDate from CUSTOM_PERIOD processing', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_PERIOD',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        currentDate: new Date('2024-01-16'),
        maxCoefficient: 10,
        customDates: [],
      });
      const availabilities = [
        {
          warehouseId: 1,
          warehouseName: 'Test',
          boxTypeID: 2 as const,
          availableDates: [
            { date: '2024-01-15', coefficient: 1.0 },
            { date: '2024-01-16', coefficient: 1.0 },
            { date: '2024-01-17', coefficient: 1.0 },
          ],
        },
      ];
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(2);

      const effectiveDates = result[0].matchingDates.map((m) =>
        m.effectiveDate.toDateString(),
      );
      expect(effectiveDates).not.toContain('Tue Jan 16 2024');
    });

    it('should exclude currentDate from MONTH date range processing', () => {
      const startDate = new Date('2024-01-15');
      const currentDate = new Date('2024-01-20');
      const booking = createTestBooking({
        dateType: 'MONTH',
        startDate: startDate,
        currentDate: currentDate,
        maxCoefficient: 10,
        customDates: [],
      });

      const availabilities = [
        {
          warehouseId: 1,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [
            { date: '2024-01-15', coefficient: 1.0 },
            { date: '2024-01-20', coefficient: 1.0 },
          ],
        },
      ];

      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(1);

      const effectiveDates = result[0].matchingDates.map((m) =>
        m.effectiveDate.toDateString(),
      );
      expect(effectiveDates).not.toContain('Sat Jan 20 2024');
      expect(effectiveDates).toContain('Mon Jan 15 2024');
    });

    it('should exclude currentDate from CUSTOM_DATES processing', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_DATES',
        customDates: [
          new Date('2024-01-15'),
          new Date('2024-01-16'),
          new Date('2024-01-17'),
        ],
        currentDate: new Date('2024-01-16'),
        maxCoefficient: 10,
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(2);

      const effectiveDates = result[0].matchingDates.map((m) =>
        m.effectiveDate.toDateString(),
      );
      expect(effectiveDates).toContain('Mon Jan 15 2024');
      expect(effectiveDates).toContain('Wed Jan 17 2024');
      expect(effectiveDates).not.toContain('Tue Jan 16 2024');
    });

    it('should exclude currentDate from WEEK date range processing', () => {
      const startDate = new Date('2024-01-15');
      const currentDate = new Date('2024-01-17');
      const booking = createTestBooking({
        dateType: 'WEEK',
        startDate: startDate,
        currentDate: currentDate,
        maxCoefficient: 10,
      });
      const availabilities = [
        {
          warehouseId: 1,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [
            { date: '2024-01-15', coefficient: 1.0 },
            { date: '2024-01-16', coefficient: 1.0 },
            { date: '2024-01-17', coefficient: 1.0 },
            { date: '2024-01-18', coefficient: 1.0 },
          ],
        },
      ];
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(3);

      const effectiveDates = result[0].matchingDates.map((m) =>
        m.effectiveDate.toDateString(),
      );
      expect(effectiveDates).not.toContain('Wed Jan 17 2024');
    });

    it('should handle currentDate exclusion with completed dates', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_DATES',
        customDates: [
          new Date('2024-01-15'),
          new Date('2024-01-16'),
          new Date('2024-01-17'),
        ],
        completedDates: [new Date('2024-01-15')],
        currentDate: new Date('2024-01-16'),
        maxCoefficient: 10,
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(1);

      const effectiveDates = result[0].matchingDates.map((m) =>
        m.effectiveDate.toDateString(),
      );
      expect(effectiveDates).toContain('Wed Jan 17 2024');
      expect(effectiveDates).not.toContain('Mon Jan 15 2024');
      expect(effectiveDates).not.toContain('Tue Jan 16 2024');
    });

    it('should handle currentDate that is not in the date range', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_DATES',
        customDates: [new Date('2024-01-15'), new Date('2024-01-16')],
        currentDate: new Date('2024-01-20'),
        maxCoefficient: 10,
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(2);
    });

    it('should return empty array when all dates are excluded by currentDate', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_DATES',
        customDates: [new Date('2024-01-15')],
        currentDate: new Date('2024-01-15'),
        maxCoefficient: 10,
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toEqual([]);
    });

    it('should work normally when currentDate is not set', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_DATES',
        customDates: [new Date('2024-01-15'), new Date('2024-01-16')],
        maxCoefficient: 10,
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(2);
    });

    it('should work normally when currentDate is null', () => {
      const booking = createTestBooking({
        dateType: 'CUSTOM_DATES',
        customDates: [new Date('2024-01-15'), new Date('2024-01-16')],
        currentDate: null,
        maxCoefficient: 10,
      });
      const availabilities = createTestAvailabilities();
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].matchingDates).toHaveLength(2);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex multi-warehouse scenario', () => {
      const booking = createTestBooking({
        warehouseId: 1,
        supplyType: 'BOX',
        dateType: 'CUSTOM_DATES',
        customDates: [new Date('2024-01-15'), new Date('2024-01-16')],
        maxCoefficient: 1.8,
      });
      const availabilities = [
        {
          warehouseId: 1,
          warehouseName: 'Warehouse 1',
          boxTypeID: 2 as const,
          availableDates: [
            { date: '2024-01-15', coefficient: 1.5 },
            { date: '2024-01-16', coefficient: 2.5 },
          ],
        },
        {
          warehouseId: 2,
          warehouseName: 'Warehouse 2',
          boxTypeID: 2 as const,
          availableDates: [{ date: '2024-01-15', coefficient: 1.0 }],
        },
      ];
      const result = service.filterMatchingAvailabilities(
        booking,
        availabilities,
      );

      expect(result).toHaveLength(1);
      expect(result[0].availability.warehouseId).toBe(1);
      expect(result[0].matchingDates).toHaveLength(1);
      expect(result[0].matchingDates[0].availableDate.coefficient).toBe(1.5);
    });
  });
});
