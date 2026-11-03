/**
 * abort.ts — merge a caller-owned abort signal with the internal enrichment timeout.
 * Shared by both primitives (object.ts · text.ts) so a timeout and a caller cancel
 * are honored together, never dropped.
 */

/** Resolve the effective abort signal: caller signal + internal timeout, merged. */
export function effectiveSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  if (timeoutMs <= 0) return signal ?? new AbortController().signal;
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}
