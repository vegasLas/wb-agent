/**
 * Feedback Prompt Service
 * Generates AI-powered answers for customer feedbacks.
 * Isolated from business logic so prompt engineering can evolve independently.
 */

import { deepseek } from '@ai-sdk/deepseek';
import { generateText } from 'ai';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FeedbackPrompt');

import type { FeedbackItem, FeedbackTemplate } from '@/types/wb';
import type { FeedbackExample } from './feedback-example.service';
import type { RejectedAnswerContext } from './feedback-rejected.service';
import type { FeedbackRule } from '@prisma/client';

const VALUATION_LABELS: Record<number, string> = {
  1: 'negative (rated 1 star)',
  2: 'bad',
  3: 'unsatisfactory',
  4: 'good',
  5: 'excellent',
};

export class FeedbackPromptService {
  /**
   * Generate an AI answer for a feedback using Deepseek.
   */
  async generateAnswer(
    feedback: FeedbackItem,
    recentAnswers: FeedbackExample[],
    templates: FeedbackTemplate[],
    rejectedAnswers: RejectedAnswerContext[] = [],
    feedbackRules?: FeedbackRule[],
    groupExamples?: FeedbackExample[],
  ): Promise<string> {
    const productInfo = feedback.productInfo;
    const feedbackInfo = feedback.feedbackInfo;

    // Combine group-specific examples (priority) with global examples
    const combinedExamples: FeedbackExample[] = [];
    const seenTexts = new Set<string>();

    if (groupExamples && groupExamples.length > 0) {
      for (const ex of groupExamples) {
        if (seenTexts.has(ex.feedbackText)) continue;
        seenTexts.add(ex.feedbackText);
        combinedExamples.push(ex);
      }
    }

    for (const ex of recentAnswers) {
      if (seenTexts.has(ex.feedbackText)) continue;
      seenTexts.add(ex.feedbackText);
      combinedExamples.push(ex);
    }

    const recentAnswersContext = this.buildExamplesContext(
      combinedExamples.slice(0, 10),
    );
    const templatesContext = this.buildTemplatesContext(templates);
    const mediaContext = this.buildMediaContext(feedbackInfo);
    const valuationLabel = VALUATION_LABELS[feedback.valuation] || 'не указана';
    const rejectedContext = this.buildRejectedContext(rejectedAnswers);
    const userFeedbackContext = this.buildUserFeedbackContext(rejectedAnswers);
    const ruleContext = this.buildRuleContext(feedbackRules);
    const instructionContext = this.buildInstructionContext(feedbackRules);

    const prompt = this.buildPrompt({
      productInfo,
      feedbackInfo,
      valuation: feedback.valuation,
      valuationLabel,
      mediaContext,
      templatesContext,
      recentAnswersContext,
      rejectedContext,
      userFeedbackContext,
      ruleContext,
      instructionContext,
      hasGroupExamples: !!(groupExamples && groupExamples.length > 0),
    });
    try {
      const { text } = await generateText({
        model: deepseek('deepseek-v4-flash'),
        prompt,
        maxTokens: 512,
        temperature: 0.7,
      });

      return text.trim();
    } catch (error) {
      logger.error('AI generation failed:', error);
      throw new Error('Failed to generate answer with AI');
    }
  }

  private buildExamplesContext(examples: FeedbackExample[]): string {
    if (examples.length === 0) return '(no examples)';

    return examples
      .map((a) => {
        const pros = a.feedbackTextPros
          ? ` | Pros: "${a.feedbackTextPros}"`
          : '';
        const cons = a.feedbackTextCons
          ? ` | Cons: "${a.feedbackTextCons}"`
          : '';
        return `- Review: "${a.feedbackText}"${pros}${cons} | Rating: ${a.valuation}/5 | Answer: "${a.answerText}"`;
      })
      .join('\n');
  }

  private buildTemplatesContext(templates: FeedbackTemplate[]): string {
    if (templates.length === 0) return '(no templates set)';
    return templates.map((t) => `- ${t.name}: "${t.content}"`).join('\n');
  }

  private buildMediaContext(
    feedbackInfo: FeedbackItem['feedbackInfo'],
  ): string {
    const hasPhotos = (feedbackInfo.photos?.length || 0) > 0;
    const hasVideo = !!feedbackInfo.video;

    const parts: string[] = [];
    if (hasPhotos)
      parts.push(`Customer attached ${feedbackInfo.photos?.length} photos.`);
    if (hasVideo) parts.push('Customer attached a video.');

    return parts.length > 0 ? '\n' + parts.join(' ') : '';
  }

  private buildRejectedContext(
    rejectedAnswers: RejectedAnswerContext[],
  ): string {
    if (rejectedAnswers.length === 0) return '';

    const lines = rejectedAnswers
      .map((r) => `- Ответ: "${r.rejectedAnswerText}"`)
      .join('\n');

    return `\nANSWERS THAT MUST NOT BE REPEATED (previously rejected):\n${lines}\n`;
  }

  private buildUserFeedbackContext(
    rejectedAnswers: RejectedAnswerContext[],
  ): string {
    const feedbacks = rejectedAnswers
      .map((r) => r.userFeedback)
      .filter((f): f is string => !!f && f.trim().length > 0)
      .slice(0, 40);

    if (feedbacks.length === 0) return '';

    const lines = feedbacks.map((f) => `- ${f}`).join('\n');
    return `\nUSER FEEDBACK FROM PREVIOUSLY REJECTED ANSWERS (learn from these mistakes):\n${lines}\n`;
  }

  private buildRuleContext(rules?: FeedbackRule[]): string {
    // Skip rules are evaluated before calling AI, no need to tell AI about them
    return '';
  }

  private buildInstructionContext(rules?: FeedbackRule[]): string {
    if (!rules || rules.length === 0) return '';

    const instructionRules = rules.filter(
      (r) => r.enabled && r.mode === 'instruction' && r.instruction,
    );
    if (instructionRules.length === 0) return '';

    const lines = instructionRules.map((r) => `- ${r.instruction}`);
    return `\nSPECIAL INSTRUCTIONS FOR THIS REVIEW:\n${lines.join('\n')}\n`;
  }

  private buildPrompt(params: {
    productInfo: FeedbackItem['productInfo'];
    feedbackInfo: FeedbackItem['feedbackInfo'];
    valuation: number;
    valuationLabel: string;
    mediaContext: string;
    templatesContext: string;
    recentAnswersContext: string;
    rejectedContext: string;
    userFeedbackContext: string;
    ruleContext: string;
    instructionContext: string;
    hasGroupExamples: boolean;
  }): string {
    const groupNote = params.hasGroupExamples
      ? '*(examples include answers from related products in the same group)*\n'
      : '';

    return `You are a professional review manager for the Wildberries marketplace.
Your task is to write a personalized, warm, and professional response to a customer review.
Respond in Russian language only.

PRODUCT INFORMATION:
- Name: ${params.productInfo.name}
- Brand: ${params.productInfo.brand}
- Supplier article: ${params.productInfo.supplierArticle}

CUSTOMER REVIEW:
- Name: ${params.feedbackInfo.userName}
- Text: ${params.feedbackInfo.feedbackText || '(no text)'}
- Pros: ${params.feedbackInfo.feedbackTextPros || '(not specified)'}
- Cons: ${params.feedbackInfo.feedbackTextCons || '(not specified)'}
- Rating: ${params.valuation} out of 5 (${params.valuationLabel})${params.mediaContext}

${params.instructionContext}${params.userFeedbackContext}
EXAMPLE ANSWERS FOR ${params.valuation}/5 RATED REVIEWS (use as tone and style reference):
${groupNote}${params.recentAnswersContext}${params.rejectedContext}${params.ruleContext}
RULES:
1. Address the customer by name (${params.feedbackInfo.userName}).
2. Thank them for the purchase and the review.
3. If there are pros — thank them for mentioning them.
4. If there are cons — apologize and gently explain the situation.
5. Mention the brand "${params.productInfo.brand}".
6. Answer length: 100-300 characters.
7. Tone: friendly, professional.
8. Avoid template phrases — write naturally and vividly.
9. Use examples as a reference for structure and tone, but do not copy their text — every answer must be original and unique.
10. Consider user feedback from rejected answers and avoid repeating those mistakes.
11. Respond ONLY with the answer text, no explanations.

SELLER ANSWER TEMPLATES (use as style reference):
${params.templatesContext}

Answer:`;
  }
}

export const feedbackPromptService = new FeedbackPromptService();
