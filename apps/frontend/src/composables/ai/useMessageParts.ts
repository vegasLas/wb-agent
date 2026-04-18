import { computed } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { normalizeToolName } from '@/utils/ai-labels';
import type { UIMessage } from 'ai';

type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

interface TextPart {
  type: 'text';
  text: string;
}

interface ToolInvocationPart {
  type: 'tool-invocation';
  toolCallId?: string;
  toolInvocation?: {
    toolCallId?: string;
    toolName?: string;
    state?: 'call' | 'result';
    result?: unknown;
  };
}

interface DynamicToolPart {
  type: 'dynamic-tool' | `tool-${string}`;
  toolCallId?: string;
  toolName?: string;
  state?: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
}

type MessagePart = TextPart | ToolInvocationPart | DynamicToolPart | Record<string, unknown>;

interface MessageWithParts {
  role: MessageRole;
  parts?: MessagePart[];
}

export interface ToolPartInfo {
  toolName: string;
  state: 'call' | 'result';
}

export interface ProcessedTextPart {
  type: 'text';
  text: string;
  html: string;
}

export interface ProcessedToolPart {
  type: 'tool';
  toolInfo: ToolPartInfo;
}

export interface ProcessedFilePart {
  type: 'file';
  filename: string;
  mediaType: string;
}

export type ProcessedPart = ProcessedTextPart | ProcessedToolPart | ProcessedFilePart;

function isTextPart(part: unknown): part is TextPart {
  return typeof part === 'object' && part !== null && (part as Record<string, unknown>).type === 'text';
}

function isToolInvocationPart(part: unknown): part is ToolInvocationPart {
  return typeof part === 'object' && part !== null && (part as Record<string, unknown>).type === 'tool-invocation';
}

function isDynamicToolPart(part: unknown): part is DynamicToolPart {
  if (typeof part !== 'object' || part === null) return false;
  const p = part as Record<string, unknown>;
  if (p.type === 'dynamic-tool') return true;
  return typeof p.type === 'string' && p.type.startsWith('tool-');
}

function isFilePart(part: unknown): part is { type: 'file'; filename?: string; mediaType?: string } {
  return typeof part === 'object' && part !== null && (part as Record<string, unknown>).type === 'file';
}

function getToolCallId(part: ToolInvocationPart | DynamicToolPart, info: ToolPartInfo): string {
  if ('toolCallId' in part && part.toolCallId) return part.toolCallId;
  if (
    'toolInvocation' in part &&
    typeof part.toolInvocation === 'object' &&
    part.toolInvocation !== null
  ) {
    const ti = part.toolInvocation as Record<string, unknown>;
    if (typeof ti.toolCallId === 'string' && ti.toolCallId) return ti.toolCallId;
    if (typeof ti.toolName === 'string' && ti.toolName) return ti.toolName;
  }
  return info.toolName;
}

function getToolPartInfo(
  part: MessagePart,
  isToolFinished: (id: string) => boolean,
): ToolPartInfo | null {
  if (isToolInvocationPart(part)) {
    const toolCallId = part.toolInvocation?.toolCallId ?? '';
    const isFinished = toolCallId ? isToolFinished(toolCallId) : false;
    const hasResult = part.toolInvocation?.result !== undefined;
    return {
      toolName: normalizeToolName(part.toolInvocation?.toolName) || 'unknown',
      state: isFinished || hasResult ? 'result' : part.toolInvocation?.state || 'call',
    };
  }

  if (isDynamicToolPart(part)) {
    const state = part.state;
    const isDone = state === 'output-available' || state === 'output-error';
    return {
      toolName: normalizeToolName(part.toolName || part.type) || 'unknown',
      state: isDone ? 'result' : 'call',
    };
  }

  return null;
}

function sanitizeAssistantText(text: string): string {
  let cleaned = text
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '')
    .replace(/\(?\s*(оригид|warehouseId)\s*[:\-]?\s*\d+\s*\)?/gi, '');

  cleaned = cleaned.replace(/(:\s+)([-*]\s)/g, '$1\n\n$2');
  cleaned = cleaned.replace(/([:?.!]\s+)(\d{1,2}[.\)]\s+\S)/g, '$1\n\n$2');

  cleaned = cleaned
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .trim();

  return cleaned;
}

function renderTextHtml(text: string, role: MessageRole): string {
  if (!text) return '';
  const safeText = role === 'assistant' ? sanitizeAssistantText(text) : text;
  const parsed = marked.parse(safeText, { breaks: true, gfm: true }) as string;
  return DOMPurify.sanitize(parsed);
}

export function useMessageParts(
  message: () => MessageWithParts | UIMessage,
  isToolFinished: (id: string) => boolean,
) {
  return computed<ProcessedPart[]>(() => {
    const msg = message();
    const parts = msg?.parts || [];
    const toolCallStates = new Map<string, ToolPartInfo>();

    for (const part of parts) {
      const info = getToolPartInfo(part, isToolFinished);
      if (info) {
        const id = getToolCallId(part as ToolInvocationPart | DynamicToolPart, info);
        const existing = toolCallStates.get(id);
        if (!existing || (existing.state !== 'result' && info.state === 'result')) {
          toolCallStates.set(id, info);
        }
      }
    }

    const seenToolCalls = new Set<string>();
    const result: ProcessedPart[] = [];
    const seenFiles = new Set<string>();

    for (const part of parts) {
      if (isTextPart(part)) {
        if (part.text) {
          result.push({
            type: 'text',
            text: part.text,
            html: renderTextHtml(part.text, msg.role),
          });
        }
        continue;
      }

      if (isFilePart(part)) {
        const filename = part.filename || 'file';
        const key = `${filename}-${part.mediaType}`;
        if (seenFiles.has(key)) continue;
        seenFiles.add(key);
        result.push({
          type: 'file',
          filename,
          mediaType: part.mediaType || '',
        });
        continue;
      }

      const info = getToolPartInfo(part, isToolFinished);
      if (info) {
        const id = getToolCallId(part as ToolInvocationPart | DynamicToolPart, info);
        if (seenToolCalls.has(id)) continue;
        seenToolCalls.add(id);
        result.push({
          type: 'tool',
          toolInfo: toolCallStates.get(id) || info,
        });
      }
    }

    return result;
  });
}
