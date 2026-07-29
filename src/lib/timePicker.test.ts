import { describe, expect, test } from 'vitest';
import { formatTime, parseTime } from './format';
import {
  MAX_PICKER_SECONDS,
  clampSeconds,
  fromParts,
  minuteOptions,
  secondOptions,
  toParts,
} from './timePicker';

// ---------------------------------------------------------------------------

describe('minuteOptions', () => {
  test('without a ceiling, runs 0..59 (no hours column in m:ss)', () => {
    const m = minuteOptions();
    expect(m[0]).toBe(0);
    expect(m[m.length - 1]).toBe(59);
    expect(m).toHaveLength(60);
  });

  test('a 12:00 cap stops the minutes column at 12', () => {
    expect(minuteOptions(720)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  test('a cap with leftover seconds still exposes its own minute', () => {
    expect(minuteOptions(725)[minuteOptions(725).length - 1]).toBe(12);
  });

  test('a sub-minute cap leaves only minute 0', () => {
    expect(minuteOptions(45)).toEqual([0]);
  });
});

// ---------------------------------------------------------------------------

describe('secondOptions', () => {
  test('a non-ceiling minute offers the full 0..59', () => {
    expect(secondOptions(8, 720)).toHaveLength(60);
    expect(secondOptions(8, 720)[59]).toBe(59);
  });

  test('the ceiling minute is truncated — 12:01 is unreachable under a 12:00 cap', () => {
    expect(secondOptions(12, 720)).toEqual([0]);
  });

  test('a 12:05 cap allows 12:00..12:05 and nothing beyond', () => {
    expect(secondOptions(12, 725)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test('without a ceiling, every minute offers 0..59', () => {
    expect(secondOptions(0)).toHaveLength(60);
    expect(secondOptions(59)).toHaveLength(60);
  });
});

// ---------------------------------------------------------------------------

describe('clampSeconds', () => {
  test('an over-cap value is seated at the cap', () => {
    expect(clampSeconds(810, 720)).toBe(720);
  });

  test('a value under the cap passes through', () => {
    expect(clampSeconds(400, 720)).toBe(400);
  });

  test('negatives floor at zero', () => {
    expect(clampSeconds(-5)).toBe(0);
    expect(clampSeconds(-5, 720)).toBe(0);
  });

  test('without a ceiling, values are capped at 59:59', () => {
    expect(clampSeconds(99999)).toBe(MAX_PICKER_SECONDS);
  });

  test('non-finite input degrades to zero rather than NaN', () => {
    expect(clampSeconds(NaN, 720)).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe('toParts / fromParts', () => {
  test('round-trips through the two wheel columns', () => {
    for (const total of [0, 45, 60, 525, 720, 3599]) {
      const { minutes, seconds } = toParts(total);
      expect(fromParts(minutes, seconds)).toBe(total);
    }
  });

  test('agrees with formatTime / parseTime', () => {
    const { minutes, seconds } = toParts(525);
    expect(minutes).toBe(8);
    expect(seconds).toBe(45);
    expect(formatTime(fromParts(minutes, seconds))).toBe('8:45');
    expect(parseTime('8:45')).toBe(fromParts(minutes, seconds));
  });
});
