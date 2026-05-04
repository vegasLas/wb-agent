/**
 * Feedback Auto-Answer System — Full Flow Unit Tests
 *
 * Covers:
 * - Batch processing (processUnansweredFeedbacks)
 * - Single generation (generateAnswerForFeedback)
 * - Regeneration (regenerateAnswer)
 * - Accept / Reject
 * - Rule evaluation (skip + instruction matching)
 * - Cron plugin (feedback-auto.plugin)
 * - Prompt building (feedback-prompt.service)
 *
 * All external dependencies are mocked (WB API, Deepseek AI, Prisma, logger).
 */

import { feedbackReviewService } from '@/services/domain/feedback/feedback-review.service';
import { feedbackPromptService } from '@/services/domain/feedback/feedback-prompt.service';
import {
  setupFeedbackAutoPlugin,
} from '@/plugins/feedback-auto.plugin';
import { prisma } from '@/config/database';
import {
  wbFeedbackOfficialService,
  resolveOfficialSupplierId,
} from '@/services/external/wb/official';
import { feedbackExampleService } from '@/services/domain/feedback/feedback-example.service';
import { feedbackRejectedService } from '@/services/domain/feedback/feedback-rejected.service';
import { feedbackGoodsGroupService } from '@/services/domain/feedback/feedback-goods-group.service';

import type { FeedbackItem, FeedbackTemplate } from '@/types/wb';
import type { FeedbackExample } from '@/services/domain/feedback/feedback-example.service';
import type { FeedbackRule } from '@prisma/client';
import type { RejectedAnswerContext } from '@/services/domain/feedback/feedback-rejected.service';
import { getBillingPeriodStart } from '@/utils/subscription';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGenerateText = jest.fn();
jest.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

jest.mock('../../../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    feedbackSettings: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    feedbackProductSetting: {
      findMany: jest.fn(),
    },
    feedbackRule: {
      findMany: jest.fn(),
    },
    feedbackAutoAnswer: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    feedbackGoodsGroup: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../../services/external/wb/wb-feedback.service', () => ({
  wbFeedbackService: {
    getFeedbacks: jest.fn(),
    getFeedbackTemplates: jest.fn(),
    answerFeedback: jest.fn(),
  },
}));

jest.mock('../../../services/external/wb/official', () => ({
  wbFeedbackOfficialService: {
    getFeedbacks: jest.fn(),
    getAllUnansweredFeedbacks: jest.fn(),
    getAnsweredFeedbackExamples: jest.fn(),
    answerFeedback: jest.fn(),
  },
  resolveOfficialSupplierId: jest.fn(),
}));

jest.mock('../../../services/domain/feedback/feedback-example.service', () => ({
  feedbackExampleService: {
    fetchExamplesByValuation: jest.fn(),
    getRecentAnswersWithFallback: jest.fn(),
    getRecentPostedAnswersForGroup: jest.fn(),
  },
}));

jest.mock('../../../services/domain/feedback/feedback-goods-group.service', () => ({
  feedbackGoodsGroupService: {
    getGroups: jest.fn(),
  },
}));

jest.mock('../../../services/domain/feedback/feedback-rejected.service', () => ({
  feedbackRejectedService: {
    getRecentRejectedAnswers: jest.fn(),
    saveRejectedAnswer: jest.fn(),
  },
}));

jest.mock('../../../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('../../../utils/subscription', () => ({
  getBillingPeriodStart: jest.fn(),
}));

const mockScheduleJob = jest.fn();
jest.mock('node-schedule', () => ({
  scheduleJob: (...args: unknown[]) => mockScheduleJob(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockFeedbackItem(overrides: Partial<FeedbackItem> = {}): FeedbackItem {
  return {
    id: `fb-${Math.random().toString(36).slice(2)}`,
    answer: null,
    brandAnswer: null,
    createdDate: Date.now(),
    feedbackInfo: {
      bableReasons: null,
      badReasons: [],
      barcode: '123456789',
      buyerID: 1,
      color: 'black',
      excludeFromRating: '',
      excludedFromRating: null,
      feedbackText: 'Great product!',
      feedbackTextCons: '',
      feedbackTextPros: '',
      goodReasons: [],
      isHidden: false,
      photos: null,
      purchaseDate: Date.now(),
      rid: 'rid-1',
      size: null,
      userName: 'Test User',
      video: null,
    },
    productInfo: {
      brand: 'TestBrand',
      brandId: 1,
      category: 'Electronics',
      name: 'Test Product',
      supplierArticle: 'ART-001',
      wbArticle: 100001,
    },
    returnProductOption: { isAvailable: false, wasRequested: false },
    supplierComplaints: {
      feedbackComplaint: { id: null, isAvailable: false, status: '', text: null },
      productComplaint: { id: null, isAvailable: false, status: '', text: null },
    },
    trustFactor: 'buyout',
    valuation: 5,
    wasViewed: false,
    ...overrides,
  };
}

function createMockRule(overrides: Partial<FeedbackRule> = {}): FeedbackRule {
  return {
    id: `rule-${Math.random().toString(36).slice(2)}`,
    userId: 1,
    supplierId: 'supplier-1',
    nmIds: [100001],
    minRating: null,
    maxRating: null,
    keywords: [],
    instruction: null,
    mode: 'skip',
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockTemplate(overrides: Partial<FeedbackTemplate> = {}): FeedbackTemplate {
  return {
    id: 'tpl-1',
    name: 'Default',
    content: 'Thank you for your review!',
    ...overrides,
  };
}

function createMockExample(overrides: Partial<FeedbackExample> = {}): FeedbackExample {
  return {
    feedbackText: 'Nice product',
    answerText: 'Thanks!',
    valuation: 5,
    feedbackTextPros: null,
    feedbackTextCons: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const mockPrisma = prisma as unknown as jest.Mocked<typeof prisma>;
const mockWbFeedbackOfficial = wbFeedbackOfficialService as unknown as jest.Mocked<typeof wbFeedbackOfficialService>;
const mockResolveOfficialSupplierId = resolveOfficialSupplierId as unknown as jest.Mock;
const mockExampleService = feedbackExampleService as unknown as jest.Mocked<typeof feedbackExampleService>;
const mockRejectedService = feedbackRejectedService as unknown as jest.Mocked<typeof feedbackRejectedService>;
const mockGoodsGroupService = feedbackGoodsGroupService as unknown as jest.Mocked<typeof feedbackGoodsGroupService>;
const mockGetBillingPeriodStart = getBillingPeriodStart as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGenerateText.mockReset();

  // Default: auto-answer enabled globally
  (mockPrisma.feedbackSettings.findUnique as jest.Mock).mockResolvedValue({
    autoAnswerEnabled: true,
  });

  // Default: no product settings → all enabled
  (mockPrisma.feedbackProductSetting.findMany as jest.Mock).mockResolvedValue([]);

  // Default: no rules
  (mockPrisma.feedbackRule.findMany as jest.Mock).mockResolvedValue([]);

  // Default: no existing auto-answers
  (mockPrisma.feedbackAutoAnswer.findMany as jest.Mock).mockResolvedValue([]);

  // Default: upsert succeeds
  (mockPrisma.feedbackAutoAnswer.upsert as jest.Mock).mockResolvedValue({});
  (mockPrisma.feedbackAutoAnswer.update as jest.Mock).mockResolvedValue({});
  (mockPrisma.feedbackAutoAnswer.findUnique as jest.Mock).mockResolvedValue(null);

  // Default: official WB API returns empty
  mockResolveOfficialSupplierId.mockResolvedValue('official-supplier-1');
  mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue([]);
  mockWbFeedbackOfficial.getFeedbacks.mockResolvedValue({
    data: { feedbacks: [], countUnanswered: 0, pages: { last: '', next: '' } },
    error: false,
    errorText: '',
    additionalErrors: null,
  });
  mockWbFeedbackOfficial.answerFeedback.mockResolvedValue({ additionalErrors: null, data: {}, error: false, errorText: '' });

  // Default: no examples
  mockExampleService.fetchExamplesByValuation.mockResolvedValue(new Map());
  mockExampleService.getRecentAnswersWithFallback.mockResolvedValue([]);
  mockExampleService.getRecentPostedAnswersForGroup.mockResolvedValue([]);

  // Default: no goods groups
  mockGoodsGroupService.getGroups.mockResolvedValue([]);

  // Default: no rejected answers
  mockRejectedService.getRecentRejectedAnswers.mockResolvedValue([]);
  mockRejectedService.saveRejectedAnswer.mockResolvedValue(undefined);

  // Default: free user (no subscription)
  (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
    id: 1,
    subscriptions: [],
  });

  // Default: billing period starts at 1st of month
  mockGetBillingPeriodStart.mockResolvedValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // Default: zero feedback count
  (mockPrisma.feedbackAutoAnswer.count as jest.Mock).mockResolvedValue(0);

  // Default: AI returns text
  mockGenerateText.mockResolvedValue({ text: 'AI generated answer' });
});

// ===========================================================================
// Section 1: processUnansweredFeedbacks (Batch Flow)
// ===========================================================================

describe('processUnansweredFeedbacks (Batch Flow)', () => {
  it('1.1 should return zeros when global auto-answer is disabled', async () => {
    (mockPrisma.feedbackSettings.findUnique as jest.Mock).mockResolvedValue({
      autoAnswerEnabled: false,
    });

    const result = await feedbackReviewService.processUnansweredFeedbacks(1, 'supplier-1');

    expect(result).toEqual({ processed: 0, posted: 0, skipped: 0, failed: 0 });
    expect(mockWbFeedbackOfficial.getAllUnansweredFeedbacks).not.toHaveBeenCalled();
  });

  it('1.2 should return zeros when no unanswered feedbacks exist', async () => {
    mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue([]);

    const result = await feedbackReviewService.processUnansweredFeedbacks(1, 'supplier-1');

    expect(result).toEqual({ processed: 0, posted: 0, skipped: 0, failed: 0 });
  });

  it('1.3 should process multiple feedbacks with mixed outcomes', async () => {
    const feedbacks = [
      createMockFeedbackItem({ id: 'fb-1', valuation: 5, productInfo: { ...createMockFeedbackItem().productInfo, wbArticle: 100001 } }),
      createMockFeedbackItem({ id: 'fb-2', valuation: 4, productInfo: { ...createMockFeedbackItem().productInfo, wbArticle: 100002 } }),
      createMockFeedbackItem({ id: 'fb-3', valuation: 1, productInfo: { ...createMockFeedbackItem().productInfo, wbArticle: 100003 } }),
    ];

    mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue(feedbacks);

    // Product 100002 disabled
    (mockPrisma.feedbackProductSetting.findMany as jest.Mock).mockResolvedValue([
      { nmId: 100002, autoAnswerEnabled: false },
    ]);

    // Skip rule for rating 1
    (mockPrisma.feedbackRule.findMany as jest.Mock).mockResolvedValue([
      createMockRule({ nmIds: [100003], minRating: 1, maxRating: 1, mode: 'skip' }),
    ]);

    const result = await feedbackReviewService.processUnansweredFeedbacks(1, 'supplier-1');

    expect(result).toEqual({ processed: 3, posted: 1, skipped: 2, failed: 0 });
    expect(mockWbFeedbackOfficial.answerFeedback).toHaveBeenCalledTimes(1);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('1.4 should handle AI failure gracefully', async () => {
    const feedbacks = [
      createMockFeedbackItem({ id: 'fb-1', valuation: 5 }),
      createMockFeedbackItem({ id: 'fb-2', valuation: 5 }),
    ];

    mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue(feedbacks);

    // First succeeds, second fails
    let callCount = 0;
    mockGenerateText.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ text: 'Answer one' });
      return Promise.reject(new Error('AI Error'));
    });

    const result = await feedbackReviewService.processUnansweredFeedbacks(1, 'supplier-1');

    expect(result).toEqual({ processed: 1, posted: 1, skipped: 0, failed: 1 });
    expect(mockPrisma.feedbackAutoAnswer.upsert).toHaveBeenCalledTimes(1);
  });

  it('1.5 should pre-fetch examples by unique valuation', async () => {
    const feedbacks = [
      createMockFeedbackItem({ id: 'fb-1', valuation: 1 }),
      createMockFeedbackItem({ id: 'fb-2', valuation: 1 }),
      createMockFeedbackItem({ id: 'fb-3', valuation: 5 }),
    ];

    mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue(feedbacks);

    await feedbackReviewService.processUnansweredFeedbacks(1, 'supplier-1');

    expect(mockExampleService.fetchExamplesByValuation).toHaveBeenCalledWith(
      1,
      'supplier-1',
      expect.arrayContaining([1, 5]),
      expect.any(Number),
      expect.any(Number),
    );
  });
});

// ===========================================================================
// Section 2: Rule Evaluation (Skip + Instruction Matching)
// ===========================================================================

describe('Rule Evaluation', () => {
  it('2.1 skip rule matches — feedback blocked', async () => {
    const feedback = createMockFeedbackItem({ id: 'fb-skip', valuation: 1 });
    mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue([feedback]);

    (mockPrisma.feedbackRule.findMany as jest.Mock).mockResolvedValue([
      createMockRule({ minRating: 1, maxRating: 2, mode: 'skip' }),
    ]);

    const result = await feedbackReviewService.processUnansweredFeedbacks(1, 'supplier-1');

    expect(result).toEqual({ processed: 1, posted: 0, skipped: 1, failed: 0 });
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('2.2 skip rule does not match — feedback proceeds', async () => {
    const feedback = createMockFeedbackItem({ id: 'fb-ok', valuation: 4 });
    mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue([feedback]);

    (mockPrisma.feedbackRule.findMany as jest.Mock).mockResolvedValue([
      createMockRule({ minRating: 1, maxRating: 2, mode: 'skip' }),
    ]);

    const result = await feedbackReviewService.processUnansweredFeedbacks(1, 'supplier-1');

    expect(result).toEqual({ processed: 1, posted: 1, skipped: 0, failed: 0 });
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('2.3 skip rule with keywords matches', async () => {
    const feedback = createMockFeedbackItem({
      id: 'fb-kw',
      valuation: 3,
      feedbackInfo: { ...createMockFeedbackItem().feedbackInfo, feedbackText: 'It is broken' },
    });
    mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue([feedback]);

    (mockPrisma.feedbackRule.findMany as jest.Mock).mockResolvedValue([
      createMockRule({ keywords: ['broken'], mode: 'skip' }),
    ]);

    const result = await feedbackReviewService.processUnansweredFeedbacks(1, 'supplier-1');

    expect(result).toEqual({ processed: 1, posted: 0, skipped: 1, failed: 0 });
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('2.4 skip rule with keywords does NOT match', async () => {
    const feedback = createMockFeedbackItem({
      id: 'fb-kw-ok',
      valuation: 3,
      feedbackInfo: { ...createMockFeedbackItem().feedbackInfo, feedbackText: 'Too big for me' },
    });
    mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue([feedback]);

    (mockPrisma.feedbackRule.findMany as jest.Mock).mockResolvedValue([
      createMockRule({ keywords: ['broken'], mode: 'skip' }),
    ]);

    const result = await feedbackReviewService.processUnansweredFeedbacks(1, 'supplier-1');

    expect(result).toEqual({ processed: 1, posted: 1, skipped: 0, failed: 0 });
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('2.5 instruction rule matches — fed to AI prompt', async () => {
    const feedback = createMockFeedbackItem({ id: 'fb-inst', valuation: 1 });
    mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue([feedback]);

    (mockPrisma.feedbackRule.findMany as jest.Mock).mockResolvedValue([
      createMockRule({ minRating: 1, maxRating: 2, mode: 'instruction', instruction: 'Offer refund' }),
    ]);

    await feedbackReviewService.processUnansweredFeedbacks(1, 'supplier-1');

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const promptArg = mockGenerateText.mock.calls[0][0];
    expect(promptArg.prompt).toContain('Offer refund');
  });

  it('2.6 instruction rule does NOT match — NOT fed to AI', async () => {
    const feedback = createMockFeedbackItem({ id: 'fb-no-inst', valuation: 2 });
    mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue([feedback]);

    (mockPrisma.feedbackRule.findMany as jest.Mock).mockResolvedValue([
      createMockRule({ minRating: 4, maxRating: 5, mode: 'instruction', instruction: 'Ask referral' }),
    ]);

    await feedbackReviewService.processUnansweredFeedbacks(1, 'supplier-1');

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const promptArg = mockGenerateText.mock.calls[0][0];
    expect(promptArg.prompt).not.toContain('Ask referral');
  });

  it('2.7 multiple instruction rules — only matching ones fed', async () => {
    const feedback = createMockFeedbackItem({ id: 'fb-multi', valuation: 1 });
    mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue([feedback]);

    (mockPrisma.feedbackRule.findMany as jest.Mock).mockResolvedValue([
      createMockRule({ minRating: 1, maxRating: 2, mode: 'instruction', instruction: 'Offer refund' }),
      createMockRule({ minRating: 4, maxRating: 5, mode: 'instruction', instruction: 'Ask referral' }),
      createMockRule({ minRating: 1, maxRating: 2, mode: 'instruction', instruction: 'Apologize sincerely' }),
    ]);

    await feedbackReviewService.processUnansweredFeedbacks(1, 'supplier-1');

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const promptArg = mockGenerateText.mock.calls[0][0];
    expect(promptArg.prompt).toContain('Offer refund');
    expect(promptArg.prompt).toContain('Apologize sincerely');
    expect(promptArg.prompt).not.toContain('Ask referral');
  });

  it('2.8 instruction rule with keyword match', async () => {
    const feedback = createMockFeedbackItem({
      id: 'fb-kw-inst',
      valuation: 3,
      feedbackInfo: { ...createMockFeedbackItem().feedbackInfo, feedbackText: 'Package arrived late' },
    });
    mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue([feedback]);

    (mockPrisma.feedbackRule.findMany as jest.Mock).mockResolvedValue([
      createMockRule({ keywords: ['late'], mode: 'instruction', instruction: 'Explain shipping delays' }),
    ]);

    await feedbackReviewService.processUnansweredFeedbacks(1, 'supplier-1');

    const promptArg = mockGenerateText.mock.calls[0][0];
    expect(promptArg.prompt).toContain('Explain shipping delays');
  });

  it('2.9 instruction rule with keyword mismatch', async () => {
    const feedback = createMockFeedbackItem({
      id: 'fb-kw-no',
      valuation: 3,
      feedbackInfo: { ...createMockFeedbackItem().feedbackInfo, feedbackText: 'Wrong color' },
    });
    mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue([feedback]);

    (mockPrisma.feedbackRule.findMany as jest.Mock).mockResolvedValue([
      createMockRule({ keywords: ['late'], mode: 'instruction', instruction: 'Explain shipping delays' }),
    ]);

    await feedbackReviewService.processUnansweredFeedbacks(1, 'supplier-1');

    const promptArg = mockGenerateText.mock.calls[0][0];
    expect(promptArg.prompt).not.toContain('Explain shipping delays');
  });

  it('2.10 disabled rules are ignored', async () => {
    const feedback = createMockFeedbackItem({ id: 'fb-disabled', valuation: 1 });
    mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue([feedback]);

    (mockPrisma.feedbackRule.findMany as jest.Mock).mockResolvedValue([
      createMockRule({ minRating: 1, maxRating: 1, mode: 'skip', enabled: false }),
    ]);

    const result = await feedbackReviewService.processUnansweredFeedbacks(1, 'supplier-1');

    expect(result).toEqual({ processed: 1, posted: 1, skipped: 0, failed: 0 });
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// Section 3: generateAnswerForFeedback (Single/Manual Flow)
// ===========================================================================

describe('generateAnswerForFeedback (Single Flow)', () => {
  it('3.1 should generate answer and upsert as PENDING', async () => {
    const feedback = createMockFeedbackItem({ id: 'fb-single' });

    const answerText = await feedbackReviewService.generateAnswerForFeedback(
      1,
      'supplier-1',
      'fb-single',
      feedback,
    );

    expect(answerText).toBe('AI generated answer');
    expect(mockPrisma.feedbackAutoAnswer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId_supplierId_feedbackId: { userId: 1, supplierId: 'supplier-1', feedbackId: 'fb-single' },
        }),
        update: expect.objectContaining({ status: 'PENDING' }),
        create: expect.objectContaining({ status: 'PENDING' }),
      }),
    );
  });

  it('3.2 should throw when skip rule matches', async () => {
    const feedback = createMockFeedbackItem({ id: 'fb-single-skip', valuation: 1 });

    (mockPrisma.feedbackRule.findMany as jest.Mock).mockResolvedValue([
      createMockRule({ minRating: 1, maxRating: 1, mode: 'skip' }),
    ]);

    await expect(
      feedbackReviewService.generateAnswerForFeedback(1, 'supplier-1', 'fb-single-skip', feedback),
    ).rejects.toThrow('Feedback matches skip rule');

    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('3.3 matching instruction rule fed to prompt (manual)', async () => {
    const feedback = createMockFeedbackItem({ id: 'fb-single-inst', valuation: 1 });

    (mockPrisma.feedbackRule.findMany as jest.Mock).mockResolvedValue([
      createMockRule({ minRating: 1, maxRating: 2, mode: 'instruction', instruction: 'Offer refund' }),
    ]);

    await feedbackReviewService.generateAnswerForFeedback(1, 'supplier-1', 'fb-single-inst', feedback);

    const promptArg = mockGenerateText.mock.calls[0][0];
    expect(promptArg.prompt).toContain('Offer refund');
  });

  it('3.4 non-matching instruction rule NOT fed (manual)', async () => {
    const feedback = createMockFeedbackItem({ id: 'fb-single-no-inst', valuation: 2 });

    (mockPrisma.feedbackRule.findMany as jest.Mock).mockResolvedValue([
      createMockRule({ minRating: 4, maxRating: 5, mode: 'instruction', instruction: 'Ask referral' }),
    ]);

    await feedbackReviewService.generateAnswerForFeedback(1, 'supplier-1', 'fb-single-no-inst', feedback);

    const promptArg = mockGenerateText.mock.calls[0][0];
    expect(promptArg.prompt).not.toContain('Ask referral');
  });
});

// ===========================================================================
// Section 4: regenerateAnswer
// ===========================================================================

describe('regenerateAnswer', () => {
  it('4.1 should save old answer as rejected before regenerating', async () => {
    const feedback = createMockFeedbackItem({ id: 'fb-regen' });

    (mockPrisma.feedbackAutoAnswer.findUnique as jest.Mock).mockResolvedValue({
      id: 'auto-1',
      userId: 1,
      supplierId: 'supplier-1',
      feedbackId: 'fb-regen',
      nmId: 100001,
      feedbackText: 'Old text',
      answerText: 'Old answer',
      valuation: 5,
      status: 'PENDING',
      productName: 'Test Product',
    });

    mockGenerateText.mockResolvedValueOnce({ text: 'New regenerated answer' });

    const answerText = await feedbackReviewService.regenerateAnswer(
      1,
      'supplier-1',
      'fb-regen',
      feedback,
      'User said it was too formal',
    );

    expect(answerText).toBe('New regenerated answer');
    expect(mockRejectedService.saveRejectedAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        feedbackId: 'fb-regen',
        rejectedAnswerText: 'Old answer',
        userFeedback: 'User said it was too formal',
      }),
    );
    expect(mockPrisma.feedbackAutoAnswer.upsert).toHaveBeenCalled();
  });

  it('4.2 should generate new answer even when no previous exists', async () => {
    const feedback = createMockFeedbackItem({ id: 'fb-regen-new' });

    (mockPrisma.feedbackAutoAnswer.findUnique as jest.Mock).mockResolvedValue(null);
    mockGenerateText.mockResolvedValueOnce({ text: 'Fresh answer' });

    const answerText = await feedbackReviewService.regenerateAnswer(
      1,
      'supplier-1',
      'fb-regen-new',
      feedback,
    );

    expect(answerText).toBe('Fresh answer');
    expect(mockRejectedService.saveRejectedAnswer).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Section 5: acceptAnswer / rejectAnswer
// ===========================================================================

describe('acceptAnswer', () => {
  it('5.1 should post to WB and update status to POSTED', async () => {
    (mockPrisma.feedbackAutoAnswer.findUnique as jest.Mock).mockResolvedValue({
      id: 'auto-1',
      userId: 1,
      supplierId: 'supplier-1',
      feedbackId: 'fb-acc',
      nmId: 100001,
      answerText: 'Accepted answer',
      status: 'PENDING',
    });

    await feedbackReviewService.acceptAnswer(1, 'supplier-1', 'fb-acc');

    expect(mockWbFeedbackOfficial.answerFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierId: 'official-supplier-1',
        feedbackId: 'fb-acc',
        answerText: 'Accepted answer',
      }),
    );
    expect(mockPrisma.feedbackAutoAnswer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId_supplierId_feedbackId: { userId: 1, supplierId: 'supplier-1', feedbackId: 'fb-acc' },
        }),
        data: expect.objectContaining({ status: 'POSTED' }),
      }),
    );
  });

  it('5.2 should not post again if already POSTED', async () => {
    (mockPrisma.feedbackAutoAnswer.findUnique as jest.Mock).mockResolvedValue({
      id: 'auto-1',
      status: 'POSTED',
    });

    await feedbackReviewService.acceptAnswer(1, 'supplier-1', 'fb-acc');

    expect(mockWbFeedbackOfficial.answerFeedback).not.toHaveBeenCalled();
    expect(mockPrisma.feedbackAutoAnswer.update).not.toHaveBeenCalled();
  });
});

describe('rejectAnswer', () => {
  it('5.3 should save rejected answer and update status to REJECTED', async () => {
    (mockPrisma.feedbackAutoAnswer.findUnique as jest.Mock).mockResolvedValue({
      id: 'auto-1',
      userId: 1,
      supplierId: 'supplier-1',
      feedbackId: 'fb-rej',
      nmId: 100001,
      feedbackText: 'Some text',
      answerText: 'Rejected answer',
      valuation: 4,
      status: 'PENDING',
      productName: 'Test Product',
    });

    await feedbackReviewService.rejectAnswer(1, 'supplier-1', 'fb-rej', 'Too generic');

    expect(mockRejectedService.saveRejectedAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        feedbackId: 'fb-rej',
        rejectedAnswerText: 'Rejected answer',
        userFeedback: 'Too generic',
      }),
    );
    expect(mockPrisma.feedbackAutoAnswer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'REJECTED' },
      }),
    );
  });

  it('5.4 should handle reject when no answer text exists', async () => {
    (mockPrisma.feedbackAutoAnswer.findUnique as jest.Mock).mockResolvedValue({
      id: 'auto-1',
      userId: 1,
      supplierId: 'supplier-1',
      feedbackId: 'fb-rej-empty',
      nmId: 100001,
      answerText: null,
      status: 'PENDING',
    });

    await feedbackReviewService.rejectAnswer(1, 'supplier-1', 'fb-rej-empty');

    expect(mockRejectedService.saveRejectedAnswer).not.toHaveBeenCalled();
    expect(mockPrisma.feedbackAutoAnswer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'REJECTED' },
      }),
    );
  });
});

// ===========================================================================
// Section 6: feedback-auto.plugin.ts (Cron Plugin)
// ===========================================================================

describe('feedback-auto.plugin.ts (Cron Plugin)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockScheduleJob.mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('6.1 should not schedule job when RUN_FEEDBACK_AUTO=false', () => {
    process.env.RUN_FEEDBACK_AUTO = 'false';

    setupFeedbackAutoPlugin();

    expect(mockScheduleJob).not.toHaveBeenCalled();
  });

  it('6.2 should schedule job when RUN_FEEDBACK_AUTO is not set', () => {
    delete process.env.RUN_FEEDBACK_AUTO;

    setupFeedbackAutoPlugin();

    expect(mockScheduleJob).toHaveBeenCalledTimes(1);
    expect(mockScheduleJob).toHaveBeenCalledWith(
      '*/30 * * * *',
      expect.any(Function),
    );
  });

  it('6.3 should skip concurrent execution when already processing', async () => {
    delete process.env.RUN_FEEDBACK_AUTO;

    // Capture the job callback
    let jobCallback: (() => Promise<void>) | null = null;
    mockScheduleJob.mockImplementation((_cron: string, cb: () => Promise<void>) => {
      jobCallback = cb;
      return { cancel: jest.fn() };
    });

    setupFeedbackAutoPlugin();
    expect(jobCallback).not.toBeNull();

    // First call starts processing
    const firstCall = jobCallback!();

    // Second call while still processing should skip
    await jobCallback!();

    // Finish first call
    await firstCall;

    // processUnansweredFeedbacks should only be called once
    expect(mockPrisma.feedbackSettings.findMany).toHaveBeenCalledTimes(1);
  });

  it('6.4 should process multiple users with auto-answer enabled', async () => {
    delete process.env.RUN_FEEDBACK_AUTO;

    (mockPrisma.feedbackSettings.findMany as jest.Mock).mockResolvedValue([
      { userId: 1, supplierId: 'supplier-1' },
      { userId: 2, supplierId: 'supplier-2' },
    ]);

    let jobCallback: (() => Promise<void>) | null = null;
    mockScheduleJob.mockImplementation((_cron: string, cb: () => Promise<void>) => {
      jobCallback = cb;
      return { cancel: jest.fn() };
    });

    setupFeedbackAutoPlugin();

    // Mock WB API so processUnansweredFeedbacks doesn't fail
    mockWbFeedbackOfficial.getAllUnansweredFeedbacks.mockResolvedValue([]);

    await jobCallback!();

    expect(mockPrisma.feedbackSettings.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { autoAnswerEnabled: true } }),
    );
  });
});

// ===========================================================================
// Section 7: feedback-prompt.service.ts (Prompt Building)
// ===========================================================================

describe('feedback-prompt.service.ts (Prompt Building)', () => {
  it('7.1 prompt should include all sections when data present', async () => {
    const feedback = createMockFeedbackItem({
      valuation: 4,
      feedbackInfo: {
        ...createMockFeedbackItem().feedbackInfo,
        feedbackText: 'Great product!',
        feedbackTextPros: 'Good quality',
        feedbackTextCons: 'A bit pricey',
        photos: [{ fullSizeUrl: 'http://img.jpg', thumbUrl: 'http://thumb.jpg' }],
        userName: 'Alice',
      },
    });

    const templates: FeedbackTemplate[] = [createMockTemplate()];
    const examples: FeedbackExample[] = [createMockExample()];
    const rejected: RejectedAnswerContext[] = [
      {
        id: 'rej-1',
        feedbackText: 'Old text',
        rejectedAnswerText: 'Bad answer',
        aiAnalysis: null,
        mistakeCategory: null,
        userFeedback: 'Too short',
        nmId: 100001,
        createdAt: new Date(),
      },
    ];
    const rules: FeedbackRule[] = [
      createMockRule({ mode: 'instruction', instruction: 'Mention discount code' }),
    ];

    await feedbackPromptService.generateAnswer(1, feedback, examples, templates, rejected, rules);

    const promptArg = mockGenerateText.mock.calls[0][0];
    const prompt: string = promptArg.prompt;

    expect(prompt).toContain('Alice');
    expect(prompt).toContain('Great product!');
    expect(prompt).toContain('Good quality');
    expect(prompt).toContain('A bit pricey');
    expect(prompt).toContain('attached 1 photos');
    expect(prompt).toContain('Default');
    expect(prompt).toContain('Thank you for your review!');
    expect(prompt).toContain('Nice product');
    expect(prompt).toContain('SPECIAL INSTRUCTIONS FOR THIS REVIEW');
    expect(prompt).toContain('Mention discount code');
    expect(prompt).toContain('USER FEEDBACK FROM PREVIOUSLY REJECTED ANSWERS');
    expect(prompt).toContain('Too short');
    expect(prompt).toContain('ANSWERS THAT MUST NOT BE REPEATED');
    expect(prompt).toContain('Bad answer');
  });

  it('7.2 prompt should exclude empty sections', async () => {
    const feedback = createMockFeedbackItem({
      valuation: 5,
      feedbackInfo: {
        ...createMockFeedbackItem().feedbackInfo,
        feedbackText: 'Nice',
        feedbackTextPros: '',
        feedbackTextCons: '',
        photos: null,
        userName: 'Bob',
      },
    });

    await feedbackPromptService.generateAnswer(1, feedback, [], [], []);

    const promptArg = mockGenerateText.mock.calls[0][0];
    const prompt: string = promptArg.prompt;

    expect(prompt).not.toContain('ANSWERS THAT MUST NOT BE REPEATED');
    expect(prompt).not.toContain('SPECIAL INSTRUCTIONS FOR THIS REVIEW');
    expect(prompt).toContain('(not specified)'); // pros/cons empty marker
  });

  it('7.3 should throw when AI generation fails', async () => {
    mockGenerateText.mockRejectedValue(new Error('Deepseek timeout'));

    const feedback = createMockFeedbackItem();

    await expect(
      feedbackPromptService.generateAnswer(1, feedback, [], [], []),
    ).rejects.toThrow('Failed to generate answer with AI');
  });
});
