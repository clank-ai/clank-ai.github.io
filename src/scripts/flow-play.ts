/**
 * A recorded flow, replayed: what each box and line was after the first n events of the trace. The page draws the
 * finished run at build time (so it reads without scripts), and the players on Home step through it; both use these.
 */

export interface TraceEvent {
  t: number;
  box: string;
  try: number;
  kind: string;
  text: string;
  verdict: 'pass' | 'fail' | null;
}

export interface BoxState {
  phase: 'wait' | 'run' | 'done';
  verdict: 'pass' | 'fail' | null;
  tries: number;
}

export interface Replay {
  boxes: Record<string, BoxState>;
  /** Each line taken so far, by its key ("from>to"), and the one taken last. */
  taken: string[];
  now: string | null;
}

export function replay(boxIds: string[], lines: { from: string; to: string }[], events: TraceEvent[], count: number): Replay {
  const boxes: Record<string, BoxState> = {};
  for (const id of boxIds) boxes[id] = { phase: 'wait', verdict: null, tries: 0 };
  const taken = new Set<string>();
  let now: string | null = null;
  let lastEnded: string | null = null;
  for (const event of events.slice(0, count)) {
    const box = boxes[event.box];
    if (!box) continue;
    if (event.kind === 'start') {
      if (lastEnded && lines.some((line) => line.from === lastEnded && line.to === event.box)) {
        now = `${lastEnded}>${event.box}`;
        taken.add(now);
      }
      box.phase = 'run';
      box.verdict = null;
      box.tries = Math.max(box.tries, event.try || 1);
    } else if (event.kind === 'end') {
      box.phase = 'done';
      box.tries = Math.max(box.tries, event.try || 1);
      lastEnded = event.box;
    } else if (event.kind === 'verdict') {
      box.verdict = event.verdict;
      if (box.phase === 'wait') box.phase = 'run';
    } else if (box.phase === 'wait') {
      box.phase = 'run';
      box.tries = Math.max(box.tries, event.try || 1);
    }
  }
  return { boxes, taken: [...taken], now };
}

/** A box's state in a few words, as its diagram box says it. */
export function stateWords(state: BoxState): string {
  const tries = state.tries > 1 ? ` · try ${state.tries}` : '';
  if (state.phase === 'wait') return state.tries ? `waits${tries}` : 'waiting';
  if (state.phase === 'run') {
    if (state.verdict) return `${state.verdict === 'pass' ? '✓ pass' : '✗ fail'}${tries}`;
    return `● running${tries}`;
  }
  if (state.verdict === 'pass') return `✓ pass${tries}`;
  if (state.verdict === 'fail') return `✗ fail${tries}`;
  return `✓ done${tries}`;
}

/** The class a box takes for its state: is-wait, is-run, is-done, is-pass or is-fail. */
export function stateClass(state: BoxState): string {
  if (state.verdict) return state.verdict === 'pass' ? 'is-pass' : 'is-fail';
  return `is-${state.phase}`;
}

/** Seconds as minutes and seconds: 0:07, 6:43, 1:02:03. */
export function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = String(whole % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
