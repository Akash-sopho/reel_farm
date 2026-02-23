/**
 * Create a debounced version of a function
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function and cancel function
 */
export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): [(...args: Parameters<T>) => void, () => void] {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };

  const cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return [debounced, cancel];
}

/**
 * Create a debounced callback with cleanup in useEffect
 */
export function createDebouncedCallback<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  delayMs: number
) {
  let timeoutId: NodeJS.Timeout | null = null;

  return {
    call: (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        callback(...args);
        timeoutId = null;
      }, delayMs);
    },
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}
