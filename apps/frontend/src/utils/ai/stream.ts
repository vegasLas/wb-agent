interface SSEEvent {
  type: string;
  toolCallId?: string;
}

export function createToolTrackingStream(
  source: ReadableStream<Uint8Array>,
  onToolFinished: (toolCallId: string) => void,
): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentStepToolCallId: string | null = null;

  return new ReadableStream({
    start(controller) {
      function push() {
        reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (!data || data === '[DONE]') continue;

              try {
                const event = JSON.parse(data) as SSEEvent;
                if (event.type === 'start-step') {
                  currentStepToolCallId = null;
                } else if (
                  event.type === 'tool-output-available' &&
                  event.toolCallId
                ) {
                  currentStepToolCallId = event.toolCallId;
                } else if (
                  event.type === 'finish-step' &&
                  currentStepToolCallId
                ) {
                  onToolFinished(currentStepToolCallId);
                  currentStepToolCallId = null;
                } else if ((event as any).error || (event as any).type === 'error') {
                  console.error('[STREAM] Backend error in SSE:', event);
                }
              } catch (parseErr) {
                // Only log if it looks like it might be an error payload rather than a data chunk
                if (data.includes('error') || data.includes('Error')) {
                  console.error('[STREAM] Failed to parse SSE data:', data, parseErr);
                }
              }
            }

            controller.enqueue(value);
            push();
          })
          .catch((err) => {
            controller.error(err);
          });
      }
      push();
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
