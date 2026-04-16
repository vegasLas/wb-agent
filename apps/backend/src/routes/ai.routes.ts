import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { aiChatService } from '@/services/ai/ai-chat.service';
import { prisma } from '@/config/database';
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

const uiPartSchema = z.union([
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.string() }).passthrough(),
]);

const chatRequestSchema = z.object({
  id: z.string().uuid().optional(),
  messages: z.array(z.object({
    id: z.string().optional(),
    role: z.enum(['user', 'assistant']),
    content: z.string().max(4000).optional(),
    parts: z.array(uiPartSchema).optional(),
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

    if (typeof (result as any).pipeUIMessageStreamToResponse === 'function') {
      console.log('[AI-BACKEND] Piping UI message stream to response');
      if ((res as any).socket) {
        (res as any).socket.setNoDelay(true);
      }
      return (result as any).pipeUIMessageStreamToResponse(res, {
        headers: {
          'Content-Encoding': 'none',
          'X-Accel-Buffering': 'no',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    }

    return res.status(500).json({ error: 'Streaming unsupported' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.errors });
    }
    console.error('[AI-ROUTE] Error:', err);
    next(err);
  }
});

// List conversations
router.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);
    const offset = parseInt(req.query.offset as string || '0', 10);

    const conversations = await prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({ conversations });
  } catch (err) {
    next(err);
  }
});

// Load conversation messages
router.get('/conversations/:id/messages', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id as string;

    const conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return res.json({ conversation, messages });
  } catch (err) {
    next(err);
  }
});

// Delete conversation
router.delete('/conversations/:id', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id as string;

    const conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await prisma.aiConversation.delete({
      where: { id: conversationId },
    });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Update conversation title
const updateTitleSchema = z.object({
  title: z.string().min(1).max(200),
});

router.patch('/conversations/:id/title', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id as string;

    const conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const parsed = updateTitleSchema.parse(req.body);

    const updated = await prisma.aiConversation.update({
      where: { id: conversationId },
      data: { title: parsed.title },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.errors });
    }
    next(err);
  }
});

export default router;
