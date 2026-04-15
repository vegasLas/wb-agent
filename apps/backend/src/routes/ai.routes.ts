import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { aiChatService } from '@/services/ai/ai-chat.service';
import { z } from 'zod';

const router = Router();

const MAX_REQUESTS = 20;
const WINDOW_MS = 60_000;
const rateLimitMap = new Map<number, number[]>();

function isRateLimited(userId: number): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(userId) ?? [];
  const windowed = requests.filter(t => now - t < WINDOW_MS);
  if (windowed.length >= MAX_REQUESTS) return true;
  windowed.push(now);
  rateLimitMap.set(userId, windowed);
  return false;
}

function sanitizeContent(content: unknown): string {
  if (typeof content !== 'string') return '';
  // Strip HTML tags
  return content.replace(/<[^>]+>/g, '').slice(0, 4000);
}

const chatRequestSchema = z.object({
  id: z.string().uuid().optional(),
  messages: z.array(z.object({
    id: z.string().optional(),
    role: z.enum(['user', 'assistant']),
    content: z.string().max(4000),
  })).max(50),
});

router.post('/chat', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    if (isRateLimited(userId)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    }

    const parsed = chatRequestSchema.parse(req.body);

    // Sanitize user messages
    const messages = parsed.messages.map(m => ({
      ...m,
      content: sanitizeContent(m.content),
    }));

    const result = await aiChatService.handleChat({
      userId,
      conversationId: parsed.id,
      messages: messages as any,
    });

    if (typeof (result as any).pipeDataStreamToResponse === 'function') {
      return (result as any).pipeDataStreamToResponse(res);
    }

    const streamResponse = (result as any).toUIMessageStreamResponse?.() || (result as any).toDataStreamResponse?.();
    if (streamResponse?.body) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      const reader = streamResponse.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
      return;
    }

    return res.status(500).json({ error: 'Streaming unsupported' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.errors });
    }
    console.error('[AI-ROUTE] Error:', err);
    return res.status(500).json({ error: 'AI service unavailable. Please try again later.' });
  }
});

export default router;
