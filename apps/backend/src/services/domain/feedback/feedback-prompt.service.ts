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

const VALUATION_LABELS: Record<number, string> = {
  1: 'негативная (оставлена с оценкой)',
  2: 'плохая',
  3: 'неудовлетворительная',
  4: 'хорошая',
  5: 'максимальная',
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
  ): Promise<string> {
    const productInfo = feedback.productInfo;
    const feedbackInfo = feedback.feedbackInfo;

    const recentAnswersContext = this.buildExamplesContext(recentAnswers);
    const templatesContext = this.buildTemplatesContext(templates);
    const mediaContext = this.buildMediaContext(feedbackInfo);
    const valuationLabel = VALUATION_LABELS[feedback.valuation] || 'не указана';
    const rejectedContext = this.buildRejectedContext(rejectedAnswers);

    const prompt = this.buildPrompt({
      productInfo,
      feedbackInfo,
      valuation: feedback.valuation,
      valuationLabel,
      mediaContext,
      templatesContext,
      recentAnswersContext,
      rejectedContext,
    });
    try {
      const { text } = await generateText({
        model: deepseek('deepseek-chat'),
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
    if (examples.length === 0) return '(нет примеров)';

    return examples
      .map((a) => {
        const pros = a.feedbackTextPros
          ? ` | Достоинства: "${a.feedbackTextPros}"`
          : '';
        const cons = a.feedbackTextCons
          ? ` | Недостатки: "${a.feedbackTextCons}"`
          : '';
        return `- Отзыв: "${a.feedbackText}"${pros}${cons} | Оценка: ${a.valuation}/5 | Ответ: "${a.answerText}"`;
      })
      .join('\n');
  }

  private buildTemplatesContext(templates: FeedbackTemplate[]): string {
    if (templates.length === 0) return '(шаблоны не заданы)';
    return templates.map((t) => `- ${t.name}: "${t.content}"`).join('\n');
  }

  private buildMediaContext(
    feedbackInfo: FeedbackItem['feedbackInfo'],
  ): string {
    const hasPhotos = (feedbackInfo.photos?.length || 0) > 0;
    const hasVideo = !!feedbackInfo.video;

    const parts: string[] = [];
    if (hasPhotos)
      parts.push(`Покупатель приложил ${feedbackInfo.photos?.length} фото.`);
    if (hasVideo) parts.push('Покупатель приложил видео.');

    return parts.length > 0 ? '\n' + parts.join(' ') : '';
  }

  private buildRejectedContext(
    rejectedAnswers: RejectedAnswerContext[],
  ): string {
    if (rejectedAnswers.length === 0) return '';

    const lines = rejectedAnswers
      .map((r) => `- "${r.rejectedAnswerText}"`)
      .join('\n');

    return `\nОТВЕТЫ, КОТОРЫЕ НЕЛЬЗЯ ПОВТОРЯТЬ (ранее отклонённые):\n${lines}\n`;
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
  }): string {
    return `Ты — профессиональный менеджер по работе с отзывами на маркетплейсе Wildberries.
Твоя задача — написать персонализированный, тёплый и профессиональный ответ на отзыв покупателя.

ИНФОРМАЦИЯ О ТОВАРЕ:
- Название: ${params.productInfo.name}
- Бренд: ${params.productInfo.brand}
- Категория: ${params.productInfo.category}
- Артикул поставщика: ${params.productInfo.supplierArticle}

ОТЗЫВ ПОКУПАТЕЛЯ:
- Имя: ${params.feedbackInfo.userName}
- Текст: ${params.feedbackInfo.feedbackText || '(без текста)'}
- Достоинства: ${params.feedbackInfo.feedbackTextPros || '(не указаны)'}
- Недостатки: ${params.feedbackInfo.feedbackTextCons || '(не указаны)'}
- Оценка: ${params.valuation} из 5 (${params.valuationLabel})${params.mediaContext}

ШАБЛОНЫ ОТВЕТОВ ПРОДАВЦА (используй как референс стиля):
${params.templatesContext}

ПРИМЕРЫ ОТВЕТОВ НА ОТЗЫВЫ С ОЦЕНКОЙ ${params.valuation}/5 (используй как референс тона и стиля для этой оценки):
${params.recentAnswersContext}${params.rejectedContext}
ПРАВИЛА:
1. Обращайся к покупателю по имени (${params.feedbackInfo.userName}).
2. Поблагодари за покупку и отзыв.
3. Если есть достоинства — поблагодари за них.
4. Если есть недостатки — извинись, объясни ситуацию мягко.
5. Упомяни бренд "${params.productInfo.brand}".
6. Длина ответа: 100-300 символов.
7. Тон: дружелюбный, профессиональный.
8. Не используй шаблонные фразы — пиши живо.
9. Учитывай ошибки из отклонённых ответов.
10. Ответь ТОЛЬКО текстом ответа, без пояснений.

Ответ:`;
  }
}

export const feedbackPromptService = new FeedbackPromptService();
