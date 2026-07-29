import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Sheet } from './Modal';
import { formatTime } from '../lib/format';
import {
  clampSeconds,
  fromParts,
  minuteOptions,
  secondOptions,
  toParts,
} from '../lib/timePicker';

/** Row height in px — must match the `h-10` on each option. */
const ITEM_H = 40;
/** Rows visible in a column; the centre one is the selection. */
const VISIBLE = 5;
const PAD_ROWS = (VISIBLE - 1) / 2;

/**
 * A tap-to-open m:ss field. Typing `8:45` on a phone is awkward (a numeric
 * keypad has no colon), so times are picked from two wheels instead.
 *
 * `maxSeconds` is a hard ceiling the wheels cannot pass — used for a WOD's
 * time cap, since when the cap clock hits, everyone stops.
 */
export function TimeField({
  value,
  onChange,
  title,
  maxSeconds,
  placeholder = 'Tap to set',
  className = '',
}: {
  value: number | null;
  onChange: (seconds: number) => void;
  title: string;
  maxSeconds?: number;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`field flex items-center justify-between text-left ${className}`}
        onClick={() => setOpen(true)}
      >
        {value != null ? (
          <span className="font-500 text-ink">{formatTime(value)}</span>
        ) : (
          <span className="text-muted">{placeholder}</span>
        )}
        <ClockIcon />
      </button>

      {open && (
        <TimePickerSheet
          title={title}
          value={value}
          maxSeconds={maxSeconds}
          onCancel={() => setOpen(false)}
          onDone={(secs) => {
            onChange(secs);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function TimePickerSheet({
  title,
  value,
  maxSeconds,
  onCancel,
  onDone,
}: {
  title: string;
  value: number | null;
  maxSeconds?: number;
  onCancel: () => void;
  onDone: (seconds: number) => void;
}) {
  // Seat on the current value, clamped — a score saved before the cap was
  // lowered opens at the cap rather than off the end of the wheel.
  const seed = toParts(clampSeconds(value ?? 0, maxSeconds));
  const [minutes, setMinutes] = useState(seed.minutes);
  const [seconds, setSeconds] = useState(seed.seconds);

  const minOpts = minuteOptions(maxSeconds);
  const secOpts = secondOptions(minutes, maxSeconds);
  const total = fromParts(minutes, seconds);

  function pickMinutes(m: number) {
    setMinutes(m);
    // Landing on the ceiling minute shortens the seconds column; pull the
    // selection back so 12:45 can't survive under a 12:00 cap.
    const allowed = secondOptions(m, maxSeconds);
    const last = allowed[allowed.length - 1];
    if (seconds > last) setSeconds(last);
  }

  return (
    <Sheet
      open
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button className="btn-quiet" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary flex-1" disabled={total === 0} onClick={() => onDone(total)}>
            Done
          </button>
        </>
      }
    >
      <div className="flex items-start justify-center gap-3">
        <Column label="min" options={minOpts} value={minutes} onChange={pickMinutes} />
        <Separator />
        <Column label="sec" options={secOpts} value={seconds} onChange={setSeconds} pad />
      </div>

      <p className="text-center text-sm text-muted">
        {formatTime(total)}
        {maxSeconds != null && <span className="text-muted"> · cap {formatTime(maxSeconds)}</span>}
      </p>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------

function Column({
  label,
  options,
  value,
  onChange,
  pad = false,
}: {
  label: string;
  options: number[];
  value: number;
  onChange: (v: number) => void;
  /** Zero-pad the displayed number (seconds read as `05`, minutes as `5`). */
  pad?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | undefined>(undefined);
  // Set just before a scroll-driven change so the effect below doesn't yank
  // the column back mid-flick and kill the momentum.
  const fromScroll = useRef(false);

  const index = Math.max(0, options.indexOf(value));

  useLayoutEffect(() => {
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }
    const el = ref.current;
    if (el) el.scrollTop = index * ITEM_H;
  }, [index]);

  function handleScroll() {
    const el = ref.current;
    if (!el) return;
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const i = Math.min(Math.max(0, Math.round(el.scrollTop / ITEM_H)), options.length - 1);
      if (options[i] !== value) {
        fromScroll.current = true;
        onChange(options[i]);
      }
    }, 90);
  }

  function handleKey(e: KeyboardEvent) {
    const step =
      e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : e.key === 'PageDown' ? 5 : e.key === 'PageUp' ? -5 : 0;
    if (step !== 0) {
      e.preventDefault();
      const i = Math.min(Math.max(0, index + step), options.length - 1);
      onChange(options[i]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(options[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(options[options.length - 1]);
    }
  }

  const spacer = PAD_ROWS * ITEM_H;

  return (
    <div>
      <div className="label mb-1.5 text-center">{label}</div>
      <div className="relative">
        {/* Selection band, drawn behind the numbers. */}
        <div
          className="pointer-events-none absolute inset-x-0 z-0 rounded-lg border-y border-hairline bg-crimson/5"
          style={{ top: spacer, height: ITEM_H }}
        />
        <div
          ref={ref}
          role="listbox"
          aria-label={label}
          tabIndex={0}
          onScroll={handleScroll}
          onKeyDown={handleKey}
          className="no-scrollbar relative z-10 w-20 snap-y snap-mandatory overflow-y-scroll overscroll-contain rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-crimson/30"
          style={{ height: VISIBLE * ITEM_H }}
        >
          <div style={{ height: spacer }} />
          {options.map((n) => (
            <div
              key={n}
              role="option"
              aria-selected={n === value}
              onClick={() => onChange(n)}
              className={`flex cursor-pointer snap-center items-center justify-center text-lg tabular-nums transition-colors ${
                n === value ? 'font-600 text-ink' : 'text-muted'
              }`}
              style={{ height: ITEM_H }}
            >
              {pad ? String(n).padStart(2, '0') : n}
            </div>
          ))}
          <div style={{ height: spacer }} />
        </div>
      </div>
    </div>
  );
}

/** The `:` between the columns, kept on the same vertical grid as the wheels. */
function Separator() {
  return (
    <div className="text-center">
      <div className="label invisible mb-1.5" aria-hidden="true">
        :
      </div>
      <div
        className="flex items-center justify-center font-display text-xl font-600 text-muted"
        style={{ height: VISIBLE * ITEM_H }}
      >
        :
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A8577" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
