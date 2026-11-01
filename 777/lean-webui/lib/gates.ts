/**
 * gates.ts — the typed-confirm gate, made structural.
 *
 * "The gate is the product": a write the user can't name is a write they
 * didn't intend. `approved: true` is produced *only* by these builders, and
 * only when the typed word matches exactly (case-sensitive). The harness also
 * throws unless `approved === true` — this is the UI half of that contract.
 */

export type RitualWhich = "saturday" | "tuesday";

/** Exact-match typed confirmation. The approve gate passes the item id as the token. */
export function confirmGate(typed: string, token: string): boolean {
  return typed.trim() === token;
}

export function promotePayload(
  typed: string,
  min: number,
): { approved: true; min: number } | { approved: false } {
  return confirmGate(typed, "PROMOTE") ? { approved: true, min } : { approved: false };
}

export function ritualPayload(
  typed: string,
  which: RitualWhich,
  run: boolean,
): { approved: true; which: RitualWhich; run: boolean } | { approved: false } {
  const token = which === "saturday" ? "SATURDAY" : "TUESDAY";
  return confirmGate(typed, token)
    ? { approved: true, which, run }
    : { approved: false };
}
