/** Chronomètre "accumulé" : temps déjà compté + segment en cours éventuel. */
export interface Stopwatch {
  accMs: number;
  /** timestamp de reprise si le chrono tourne, sinon null */
  since: number | null;
}

export const newStopwatch = (): Stopwatch => ({ accMs: 0, since: null });

export function elapsed(sw: Stopwatch, now = Date.now()): number {
  return sw.accMs + (sw.since != null ? Math.max(0, now - sw.since) : 0);
}

export function startSw(sw: Stopwatch, now = Date.now()): Stopwatch {
  return sw.since != null ? sw : { ...sw, since: now };
}

export function stopSw(sw: Stopwatch, now = Date.now()): Stopwatch {
  return sw.since == null ? sw : { accMs: elapsed(sw, now), since: null };
}

export function formatDuration(ms: number, withTenths = false): string {
  const neg = ms < 0;
  const abs = Math.abs(ms);
  const totalSec = Math.floor(abs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  let out = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  if (withTenths) out += `.${Math.floor((abs % 1000) / 100)}`;
  return (neg ? '-' : '') + out;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}
