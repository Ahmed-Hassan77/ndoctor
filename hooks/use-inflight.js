import { useCallback, useRef } from "react";

/**
 * Prevents overlapping async calls (e.g. duplicate server actions).
 */
export function useInflightGuard() {
  const inFlightRef = useRef(false);

  return useCallback(async (fn) => {
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;
    try {
      return await fn();
    } finally {
      inFlightRef.current = false;
    }
  }, []);
}

/**
 * Returns true when this key was already dispatched and is still in-flight.
 * @param {React.MutableRefObject<string | null>} activeKeyRef
 * @param {React.MutableRefObject<number>} requestIdRef
 * @param {string} key
 */
export function beginDedupedRequest(activeKeyRef, requestIdRef, key) {
  if (activeKeyRef.current === key) {
    return { skip: true, requestId: requestIdRef.current };
  }
  activeKeyRef.current = key;
  const requestId = ++requestIdRef.current;
  return { skip: false, requestId };
}

export function endDedupedRequest(activeKeyRef, key) {
  if (activeKeyRef.current === key) {
    activeKeyRef.current = null;
  }
}
