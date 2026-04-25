/**
 * AI Pricing Configuration
 * Per-model token pricing for cost calculation.
 * Prices are per 1 million tokens in USD.
 */

interface ModelPricing {
  inputPricePer1M: number;
  outputPricePer1M: number;
}

const DEFAULT_PRICING: Record<string, ModelPricing> = {
  'deepseek-v4-flash': {
    inputPricePer1M:
      parseFloat(process.env.DEEPSEEK_V4_FLASH_INPUT_PRICE_PER_1M || '0.07'),
    outputPricePer1M:
      parseFloat(process.env.DEEPSEEK_V4_FLASH_OUTPUT_PRICE_PER_1M || '0.30'),
  },
};

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = DEFAULT_PRICING[model];
  if (!pricing) {
    console.warn(`[AI-PRICING] Unknown model "${model}", cost will be 0`);
    return 0;
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.inputPricePer1M;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPricePer1M;
  const total = inputCost + outputCost;

  // Round to 6 decimal places to avoid floating-point noise
  return Math.round(total * 1_000_000) / 1_000_000;
}

export function getModelPricing(model: string): ModelPricing | undefined {
  return DEFAULT_PRICING[model];
}
