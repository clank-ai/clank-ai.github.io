/**
 * Flows against OpenCode alone, in numbers for the pages: minutes and tokens written short, and whether a summary's
 * minutes are the whole run's or each problem's on average (the capture says only "minutes": the rows decide).
 */
import type { Comparison } from '../data/captures';

export type Side = 'opencode' | 'flow';

export function minutes(value: number): string {
  if (value < 10) return `${+value.toFixed(1)}`;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

export function tokens(value: number): string {
  if (value >= 1e6) return `${+(value / 1e6).toFixed(1)}M`;
  if (value >= 1e4) return `${Math.round(value / 1e3)}K`;
  if (value >= 1e3) return `${+(value / 1e3).toFixed(1)}K`;
  return String(Math.round(value));
}

/** A side's time: its summary's minutes, said as the whole run's or as each problem's on average. */
export function timeOf(data: Comparison, side: Side): { total: number; each: number; said: string } {
  const rows = data.rows.map((row) => row[side].minutes);
  const sum = rows.reduce((a, b) => a + b, 0);
  const given = data.summary[side].minutes;
  const n = data.summary[side].n || rows.length || 1;
  const isMean = Math.abs(given - sum / n) < Math.abs(given - sum);
  const total = isMean ? given * n : given;
  return { total, each: total / n, said: `${minutes(total)} min in all` };
}

/** A problem's number as people say it: aime2026-11 is 11. */
export function problemNumber(id: string): string {
  return id.split('-').pop() ?? id;
}

/** Words as a list: "11, 12 and 13". */
export function listed(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** A side's quickest and slowest problem, in minutes as the pages write them: "12 to 17". */
export function spread(data: Comparison, side: Side): string {
  const each = data.rows.map((row) => row[side].minutes);
  const low = minutes(Math.min(...each));
  const high = minutes(Math.max(...each));
  return low === high ? low : `${low} to ${high}`;
}

/** The problems on which the two disagree: those only the flow got right, and those only OpenCode alone did. */
export function differences(data: Comparison): { flowOnly: string[]; opencodeOnly: string[] } {
  return {
    flowOnly: data.rows.filter((row) => row.flow.correct && !row.opencode.correct).map((row) => row.id),
    opencodeOnly: data.rows.filter((row) => row.opencode.correct && !row.flow.correct).map((row) => row.id),
  };
}
