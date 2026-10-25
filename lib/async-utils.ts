/**
 * Wraps a promise or async function execution with a strict maximum timeout.
 * If the promise takes longer than `timeoutMs`, it resolves with `fallbackValue`
 * instead of hanging the Next.js Server Component or App Router streaming boundary.
 */
export async function withTimeout<T>(
  promiseOrFn: Promise<T> | (() => Promise<T>),
  timeoutMs: number = 3000,
  fallbackValue: T
): Promise<T> {
  let timer: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[withTimeout] Operation timed out after ${timeoutMs}ms. Returning fallback.`);
      resolve(fallbackValue);
    }, timeoutMs);
  });

  try {
    const actualPromise = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;
    const result = await Promise.race([actualPromise, timeoutPromise]);
    clearTimeout(timer!);
    return result;
  } catch (error) {
    clearTimeout(timer!);
    console.error('[withTimeout] Operation failed with error:', error);
    return fallbackValue;
  }
}
