import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse';

const MAX_EXTRACTED_LENGTH = 4000;

export interface AttachmentMeta {
  name: string;
  type: string;
  extractedPreview?: string;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '\n\n[... текст обрезан из-за большого размера файла ...]';
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URL format');
  }
  return Buffer.from(match[2], 'base64');
}

export function extractTextFromExcel(dataUrl: string): string {
  const buffer = dataUrlToBuffer(dataUrl);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
  }) as any[][];

  if (!jsonData || jsonData.length === 0) {
    return '[Excel файл пуст]';
  }

  // Convert to markdown table
  const lines: string[] [] = jsonData.map((row) =>
    row.map((cell) => String(cell ?? '').replace(/\|/g, '\\|')),
  );

  if (lines.length === 0) {
    return '[Excel файл пуст]';
  }

  const header = lines[0];
  const separator = header.map(() => '---');
  const mdLines = [
    '| ' + header.join(' | ') + ' |',
    '| ' + separator.join(' | ') + ' |',
    ...lines.slice(1).map((row) => '| ' + row.join(' | ') + ' |'),
  ];

  const markdown = mdLines.join('\n');
  return truncateText(markdown, MAX_EXTRACTED_LENGTH);
}

export async function extractTextFromPdf(dataUrl: string): Promise<string> {
  const buffer = dataUrlToBuffer(dataUrl);
  const result = await pdfParse(buffer);
  const text = result.text?.trim() || '[PDF файл не содержит текста]';
  return truncateText(text, MAX_EXTRACTED_LENGTH);
}

interface FilePart {
  type: 'file';
  mediaType: string;
  filename?: string;
  url: string;
}

interface TextPart {
  type: 'text';
  text: string;
}

type UIPart = FilePart | TextPart | Record<string, unknown>;

interface UIMessageWithParts {
  role: string;
  parts?: UIPart[];
  content?: string;
  id?: string;
}

export async function processMessageFiles(
  messages: UIMessageWithParts[],
): Promise<{ messages: UIMessageWithParts[]; attachments: AttachmentMeta[] }> {
  const attachments: AttachmentMeta[] = [];

  const processedMessages = await Promise.all(
    messages.map(async (message) => {
      if (message.role !== 'user' || !message.parts) {
        return message;
      }

      const newParts: UIPart[] = [];

      for (const part of message.parts) {
        if (part.type !== 'file' || !part.url) {
          newParts.push(part);
          continue;
        }

        const filePart = part as FilePart;
        const mediaType = filePart.mediaType || '';
        const filename = filePart.filename || 'file';

        // Reject images (user decision)
        if (mediaType.startsWith('image/')) {
          newParts.push({
            type: 'text',
            text: `[Файл "${filename}" пропущен: анализ изображений не поддерживается]`,
          });
          attachments.push({ name: filename, type: mediaType, extractedPreview: undefined });
          continue;
        }

        // Validate data URL size (rough check: base64 ~1.33x binary)
        const base64Part = filePart.url.split(',').pop() || '';
        const approxBytes = (base64Part.length * 3) / 4;
        if (approxBytes > 10 * 1024 * 1024) {
          newParts.push({
            type: 'text',
            text: `[Файл "${filename}" слишком большой для обработки]`,
          });
          attachments.push({ name: filename, type: mediaType, extractedPreview: undefined });
          continue;
        }

        let extractedText: string;

        if (
          mediaType.includes('sheet') ||
          mediaType.includes('excel') ||
          filename.match(/\.(xlsx|xls)$/i)
        ) {
          try {
            extractedText = extractTextFromExcel(filePart.url);
          } catch (err) {
            extractedText = `[Не удалось прочитать Excel файл "${filename}"]`;
          }
        } else if (mediaType.includes('pdf') || filename.match(/\.pdf$/i)) {
          try {
            extractedText = await extractTextFromPdf(filePart.url);
          } catch (err) {
            extractedText = `[Не удалось прочитать PDF файл "${filename}"]`;
          }
        } else {
          extractedText = `[Файл "${filename}" типа ${mediaType} не поддерживается для анализа]`;
        }

        newParts.push({ type: 'text', text: extractedText });
        attachments.push({
          name: filename,
          type: mediaType,
          extractedPreview: extractedText.slice(0, 200),
        });
      }

      return { ...message, parts: newParts };
    }),
  );

  return { messages: processedMessages, attachments };
}
