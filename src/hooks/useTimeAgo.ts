import { useEffect, useState } from 'react';

/**
 * Returns a human‑readable "time‑ago” string (e.g. "2 hours ago”)
 * for the supplied Date.  Re‑evaluates automatically every minute.
 *
 * Passing `null` returns an em‑dash placeholder.
 */
export function useTimeAgo(date: Date | null): string {
  /* ---------- helpers ---------- */
  const format = (d: Date | null): string => {
    if (!d) return '—';

    const diffMs = Date.now() - d.getTime();
    const sec = Math.floor(diffMs / 1000);

    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  /* ---------- state ---------- */
  const [text, setText] = useState(() => format(date));

  /* ---------- effects ---------- */
  useEffect(() => {
    setText(format(date)); // immediate update on date change
    if (!date) return;

    const id = setInterval(() => setText(format(date)), 60_000); // update each minute
    return () => clearInterval(id);
  }, [date]);

  return text;
}
