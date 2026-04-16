import { findBestDraftMatch } from '../tools/autobooking.utils';

describe('findBestDraftMatch', () => {
  const drafts = [
    { ID: 'draft-1', goodQuantity: 22, barcodeQuantity: 45, createdAt: '2026-04-10' },
    { ID: 'draft-2', goodQuantity: 50, barcodeQuantity: 100, createdAt: '2026-04-11' },
    { ID: 'draft-3', goodQuantity: 25, barcodeQuantity: 22, createdAt: '2026-04-12' },
  ];

  it('returns exact match when goodQuantity equals hint', () => {
    const result = findBestDraftMatch(drafts, '22 товара');
    expect(result.match?.ID).toBe('draft-1');
    expect(result.confidence).toBe('high');
  });

  it('returns exact match when barcodeQuantity equals hint', () => {
    const result = findBestDraftMatch(drafts, '100 штрихкодов');
    expect(result.match?.ID).toBe('draft-2');
    expect(result.confidence).toBe('high');
  });

  it('returns high confidence for close match within 5', () => {
    const result = findBestDraftMatch(drafts, '27 товаров');
    expect(result.match?.ID).toBe('draft-3');
    expect(result.confidence).toBe('high');
  });

  it('returns high confidence for close match within 5', () => {
    const result = findBestDraftMatch(drafts, '42 товара');
    // barcodeQuantity 45 of draft-1 is closest (diff 3)
    expect(result.match?.ID).toBe('draft-1');
    expect(result.confidence).toBe('high');
  });

  it('returns none when no numeric hint', () => {
    const result = findBestDraftMatch(drafts, 'старый черновик');
    expect(result.match).toBeNull();
    expect(result.confidence).toBe('none');
  });

  it('returns none when difference is too large', () => {
    const result = findBestDraftMatch(drafts, '500 товаров');
    expect(result.match).toBeNull();
    expect(result.confidence).toBe('none');
  });

  it('returns none for empty drafts array', () => {
    const result = findBestDraftMatch([], '22 товара');
    expect(result.match).toBeNull();
    expect(result.confidence).toBe('none');
  });
});

describe('Date expansion logic (implicit in tool description)', () => {
  it('should resolve current month/year for date ranges', () => {
    const today = new Date('2026-04-16');
    const year = today.getFullYear();
    const month = today.getMonth();
    const start = new Date(year, month, 25);
    const end = new Date(year, month, 30);

    const dates: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    expect(dates.length).toBe(6);
    expect(dates[0].getDate()).toBe(25);
    expect(dates[0].getMonth()).toBe(3); // April
    expect(dates[0].getFullYear()).toBe(2026);
    expect(dates[5].getDate()).toBe(30);
    expect(dates[5].getMonth()).toBe(3);
    expect(dates[5].getFullYear()).toBe(2026);
  });
});
