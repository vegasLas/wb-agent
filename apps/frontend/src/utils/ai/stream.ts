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
                }
              } catch {
                // ignore malformed JSON
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
