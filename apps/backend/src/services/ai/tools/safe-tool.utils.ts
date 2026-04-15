export function safeTool<T>(name: string, fn: (input: T) => Promise<any>) {
  return async (input: T) => {
    try {
      return await fn(input);
    } catch (err: any) {
      const message = err?.message || 'Unknown error';
      const isRetryable = /rate limit|timeout|ECONNRESET|ECONNREFUSED/i.test(message);
      return {
        success: false,
        error: `${name} failed: ${message}`,
        retryable: isRetryable,
        suggestion: isRetryable
          ? 'Try again in a few seconds.'
          : 'Check input parameters or contact support.',
      };
    }
  };
}

const cache = new Map<string, { ts: number; data: any }>();

export async function cachedExecute<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < ttlMs) return hit.data;
  const data = await fn();
  cache.set(key, { ts: now, data });
  return data;
}

export async function loggedTool<T>(name: string, userId: number, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    console.log(`[AI-TOOL] ${name} user=${userId} success=true duration=${Date.now() - start}ms`);
    return result;
  } catch (err: any) {
    console.log(`[AI-TOOL] ${name} user=${userId} success=false error="${err.message}" duration=${Date.now() - start}ms`);
    throw err;
  }
}
