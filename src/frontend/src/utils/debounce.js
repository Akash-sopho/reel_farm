/**
 * Create a debounced version of a function
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function and cancel function
 */
export function useDebounce(func, wait) {
    let timeout = null;
    const debounced = (...args) => {
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
export function createDebouncedCallback(callback, delayMs) {
    let timeoutId = null;
    return {
        call: (...args) => {
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
