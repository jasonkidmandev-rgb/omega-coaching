/**
 * Helpers for the boolean-ish DB flags (`isActive`, `isDiscountable`, `isIncluded`, …).
 *
 * These columns are declared `tinyint()` in the Drizzle schema, which maps to a
 * **number (0 | 1)** — not a real boolean. That makes the natural-looking checks
 * silently wrong:
 *
 *     item.isDiscountable === false   // 0 === false  -> FALSE, never matches
 *     item.isDiscountable !== false   // 0 !== false  -> TRUE, never excludes
 *
 * TypeScript would have caught both, which is why every such site in this codebase
 * carries an `as any` cast. The damage was real: "non-discountable" was ignored in
 * pricing, and edit forms defaulted flags back to ON — so saving an item silently
 * flipped it.
 *
 * Use these instead of comparing a flag to `true`/`false`.
 */

/** True when the flag is on. Missing/null falls back to `whenMissing` (default: on). */
export function flagOn(value: unknown, whenMissing = true): boolean {
  if (value === null || value === undefined) return whenMissing;
  return value === true || value === 1 || value === "1";
}

/** True when the flag is explicitly off. Missing/null falls back to `whenMissing`. */
export function flagOff(value: unknown, whenMissing = false): boolean {
  if (value === null || value === undefined) return whenMissing;
  return value === false || value === 0 || value === "0";
}
