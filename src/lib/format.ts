/** Format seconds as m:ss (or h:mm:ss for long domains). */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Parse "m:ss", "mm:ss", "h:mm:ss", or a plain number of seconds → seconds. */
export function parseTime(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  const parts = trimmed.split(':').map((p) => p.trim());
  if (parts.some((p) => p === '' || !/^\d+$/.test(p))) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  return null;
}

/** Format a placement number that may be fractional (from a tie), e.g. 2.5. */
export function formatPlacement(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Ordinal suffix: 1 -> "1st", 2 -> "2nd", 3.5 -> "3.5". */
export function ordinal(n: number): string {
  if (!Number.isInteger(n)) return n.toFixed(1);
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
