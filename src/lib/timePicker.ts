/**
 * Pure rules behind the m:ss wheel picker.
 *
 * Kept out of the component because vitest runs with `environment: 'node'`
 * (see vite.config.ts) — there is no DOM, so only pure logic is testable.
 */

/** A m:ss picker has no hours column, so 59:59 is the highest reachable value. */
export const MAX_PICKER_SECONDS = 59 * 60 + 59;

function ceiling(maxSeconds?: number): number {
  if (maxSeconds == null || !Number.isFinite(maxSeconds)) return MAX_PICKER_SECONDS;
  return Math.min(Math.max(0, Math.floor(maxSeconds)), MAX_PICKER_SECONDS);
}

function range(end: number): number[] {
  return Array.from({ length: end + 1 }, (_, i) => i);
}

/** Minutes selectable under an optional hard ceiling (e.g. a WOD's time cap). */
export function minuteOptions(maxSeconds?: number): number[] {
  return range(Math.floor(ceiling(maxSeconds) / 60));
}

/**
 * Seconds selectable for a chosen minute. On the ceiling minute the column is
 * truncated — that is what makes 12:01 unreachable under a 12:00 cap.
 */
export function secondOptions(minute: number, maxSeconds?: number): number[] {
  const max = ceiling(maxSeconds);
  return minute === Math.floor(max / 60) ? range(max % 60) : range(59);
}

/** Clamp a total into [0, ceiling]. Seats legacy over-cap scores at the cap. */
export function clampSeconds(total: number, maxSeconds?: number): number {
  if (!Number.isFinite(total)) return 0;
  return Math.min(Math.max(0, Math.round(total)), ceiling(maxSeconds));
}

export function toParts(total: number): { minutes: number; seconds: number } {
  const s = Math.max(0, Math.round(total));
  return { minutes: Math.floor(s / 60), seconds: s % 60 };
}

export function fromParts(minutes: number, seconds: number): number {
  return minutes * 60 + seconds;
}
