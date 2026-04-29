/**
 * AI Pricing Configuration
 * Per-model token pricing for cost calculation.
 * Prices are per 1 million tokens in USD.
 *
 * DeepSeek pricing tiers:
 * - Cache miss (new input):  $0.14 per 1M
 * - Cache hit (cached input): $0.0028 per 1M (90% cheaper)
 * - Output (completion):      $0.28 per 1M
 */

export interface ModelPricing {
  cacheMissPricePer1M: number;  // non-cached input tokens
  cacheHitPricePer1M: number;   // cached input tokens
  outputPricePer1M: number;     // completion/output tokens
}

const DEFAULT_PRICING: Record<string, ModelPricing> = {
  'deepseek-v4-flash': {
    cacheMissPricePer1M:
      parseFloat(process.env.DEEPSEEK_V4_FLASH_CACHE_MISS_PRICE_PER_1M || '0.14'),
    cacheHitPricePer1M:
      parseFloat(process.env.DEEPSEEK_V4_FLASH_CACHE_HIT_PRICE_PER_1M || '0.0028'),
    outputPricePer1M:
      parseFloat(process.env.DEEPSEEK_V4_FLASH_OUTPUT_PRICE_PER_1M || '0.28'),
  },
};

/**
 * Calculate AI cost with cache-aware pricing.
 *
 * @param model           - Model identifier
 * @param noCacheTokens   - Non-cached input tokens (cache miss)
 * @param cacheReadTokens - Cached input tokens (cache hit)
 * @param outputTokens    - Output/completion tokens
 */
export function calculateCost(
  model: string,
  noCacheTokens: number,
  cacheReadTokens: number,
  outputTokens: number,
): number {
  const pricing = DEFAULT_PRICING[model];
  if (!pricing) {
    console.warn(`[AI-PRICING] Unknown model "${model}", cost will be 0`);
    return 0;
  }

  const missCost = (noCacheTokens / 1_000_000) * pricing.cacheMissPricePer1M;
  const hitCost = (cacheReadTokens / 1_000_000) * pricing.cacheHitPricePer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePer1M;
  const total = missCost + hitCost + outputCost;

  // Round to 6 decimal places to avoid floating-point noise
  return Math.round(total * 1_000_000) / 1_000_000;
}

export function getModelPricing(model: string): ModelPricing | undefined {
  return DEFAULT_PRICING[model];
}
