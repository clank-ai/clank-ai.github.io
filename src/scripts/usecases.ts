/**
 * Home's top (src/components/hero/UseCases.astro): the four tabs, and each tab's recording played back.
 *
 * A recording of screens (VS Code, the console, the iPhone) shows each frame for the time to the next one as recorded,
 * between 2.5 and 7 seconds; the flow shows each event of its run long enough to read (an event that only ends a box
 * passes quickly). When a recording ends, the next tab plays, until the visitor picks a tab or steps a frame: then that
 * tab plays again from its start. It plays only while it is in view and the page is shown. With
 * prefers-reduced-motion nothing moves by itself: each tab shows a still (a flow, its finished run), and the arrows
 * step through it. The tabs follow the tab pattern: arrow keys, Home and End move between them.
 */
import { clock, replay, stateClass, stateWords, type TraceEvent } from './flow-play';

interface Player {
  n: number;
  times: number[];
  show(k: number): void;
  dwell(k: number): number; // seconds
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (x: number, low: number, high: number) => Math.min(high, Math.max(low, x));

function screens(panel: HTMLElement, cap: HTMLElement | undefined): Player {
  const frames = [...panel.querySelectorAll<HTMLElement>('.uc-frame')];
  const times = JSON.parse(panel.dataset.times ?? '[]') as number[];
  const words = [...(cap?.querySelectorAll<HTMLElement>('[data-cap-frame]') ?? [])];
  return {
    n: frames.length,
    times,
    show(k) {
      frames.forEach((frame, i) => frame.classList.toggle('on', i === k));
      words.forEach((word, i) => (word.hidden = i !== k));
    },
    dwell(k) {
      return k < frames.length - 1 ? clamp((times[k + 1] ?? 0) - (times[k] ?? 0), 2.5, 7) : 5;
    },
  };
}

/** The events a long run stops at in this small view: each box's start, each verdict, a few of what the boxes wrote
 * and ran, and the last; a run of 24 events or fewer stops at each. */
function stops(events: { kind: string }[]): number[] {
  const all = events.map((_, i) => i);
  if (events.length <= 24) return all;
  const key = all.filter((i) => events[i].kind === 'start' || events[i].kind === 'verdict' || i === events.length - 1);
  const said = all.filter((i) => events[i].kind === 'text' || events[i].kind === 'tool');
  const every = Math.max(1, Math.ceil(said.length / 8));
  return [...new Set([...key, ...said.filter((_, k) => k % every === 0)])].sort((a, b) => a - b);
}

const FLOW_SECONDS = 45; // the most a run takes to play here

function flow(panel: HTMLElement): Player {
  const data = JSON.parse(panel.dataset.flow ?? '{}') as {
    boxes: string[];
    lines: { from: string; to: string }[];
    events: (TraceEvent & { n: number })[];
  };
  const items = [...panel.querySelectorAll<HTMLElement>('.uc-ev')];
  const answer = panel.querySelector<HTMLElement>('[data-answer]');
  const at = stops(data.events);
  const n = at.length;
  const raw = at.map((index, k) => {
    if (k >= n - 1) return 5;
    if (data.events[index].kind === 'end') return 0.5;
    return clamp(1.2 + data.events[index].n * 0.022, 1.5, 3.6);
  });
  const total = raw.reduce((a, b) => a + b, 0);
  const scale = Math.min(1, FLOW_SECONDS / total);
  return {
    n,
    times: at.map((index) => data.events[index].t),
    show(k) {
      const index = at[k];
      const state = replay(data.boxes, data.lines, data.events, index + 1);
      for (const box of panel.querySelectorAll<SVGGElement>('[data-box]')) {
        const s = state.boxes[box.dataset.box ?? ''];
        if (!s) continue;
        box.classList.remove('is-wait', 'is-run', 'is-done', 'is-pass', 'is-fail');
        box.classList.add(stateClass(s));
        const words = box.querySelector('[data-state]');
        if (words) words.textContent = stateWords(s);
      }
      for (const line of panel.querySelectorAll<SVGGElement>('[data-line]')) {
        line.classList.toggle('is-taken', state.taken.includes(line.dataset.line ?? ''));
        line.classList.toggle('is-now', k < n - 1 && state.now === line.dataset.line);
      }
      const before = k > 0 ? at[k - 1] : -1;
      items.forEach((item, i) => {
        item.classList.toggle('shown', i === index || i === before);
        item.classList.toggle('now', i === index);
      });
      answer?.classList.toggle('later', k < n - 1);
    },
    dwell(k) {
      return k >= n - 1 ? raw[k] : Math.max(0.5, raw[k] * scale);
    },
  };
}

function setup(root: HTMLElement) {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = tabs.map((tab) => root.querySelector<HTMLElement>(`#${tab.getAttribute('aria-controls')}`)!);
  const caps = tabs.map((tab) => root.querySelector<HTMLElement>(`[data-cap="${tab.dataset.tab}"]`) ?? undefined);
  const players = panels.map((panel, i) => (panel.dataset.flow ? flow(panel) : screens(panel, caps[i])));
  const count = root.querySelector<HTMLElement>('[data-count]');
  const playButton = root.querySelector<HTMLButtonElement>('[data-act="play"]');

  let current = 0;
  let frame = 0;
  let playing = !reduced.matches;
  let chosen = false; // the visitor picked a tab or a frame: the tabs no longer go on by themselves
  let inView = false;
  let timer = 0;

  function paint() {
    const player = players[current];
    player.show(frame);
    if (count) count.textContent = `${frame + 1} of ${player.n} · ${clock(player.times[frame] ?? 0)}`;
    root.classList.toggle('paused', !playing);
    root.classList.toggle('rolling', playing && !chosen);
    playButton?.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  /** The active tab's line: how much of its recording has played. */
  function progress(wait: number) {
    const player = players[current];
    const total = Array.from({ length: player.n }, (_, k) => player.dwell(k)).reduce((a, b) => a + b, 0);
    const before = Array.from({ length: frame }, (_, k) => player.dwell(k)).reduce((a, b) => a + b, 0);
    const bar = tabs[current].querySelector<HTMLElement>('.uc-tab-time');
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.setProperty('--done', String(before / total));
    void bar.offsetWidth;
    bar.style.transition = `transform ${wait}ms linear`;
    bar.style.setProperty('--done', String((before + wait / 1000) / total));
  }

  function schedule() {
    window.clearTimeout(timer);
    if (!playing || !inView || document.hidden) return;
    const player = players[current];
    const wait = player.dwell(frame) * 1000;
    progress(wait);
    timer = window.setTimeout(() => {
      if (frame < player.n - 1) {
        frame += 1;
        paint();
        schedule();
      } else if (!chosen) {
        select(current + 1);
      } else {
        frame = 0;
        paint();
        schedule();
      }
    }, wait);
  }

  function select(index: number, focus = false) {
    current = (index + tabs.length) % tabs.length;
    tabs.forEach((tab, i) => {
      const on = i === current;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
      if (caps[i]) caps[i]!.hidden = !on;
    });
    if (focus) tabs[current].focus();
    // A still shows the start of a recording, and a flow's finished run.
    frame = !playing && panels[current].dataset.flow ? players[current].n - 1 : 0;
    paint();
    schedule();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      chosen = true;
      select(i);
    });
  });
  root.querySelector('[role="tablist"]')?.addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key;
    const to = key === 'ArrowRight' || key === 'ArrowDown' ? current + 1
      : key === 'ArrowLeft' || key === 'ArrowUp' ? current - 1
      : key === 'Home' ? 0
      : key === 'End' ? tabs.length - 1
      : null;
    if (to === null) return;
    event.preventDefault();
    chosen = true;
    select(to, true);
  });
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => {
    chosen = true;
    frame = (frame - 1 + players[current].n) % players[current].n;
    paint();
    schedule();
  });
  root.querySelector('[data-act="next"]')?.addEventListener('click', () => {
    chosen = true;
    frame = (frame + 1) % players[current].n;
    paint();
    schedule();
  });
  playButton?.addEventListener('click', () => {
    playing = !playing;
    if (playing) chosen = true;
    paint();
    schedule();
  });

  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      schedule();
    },
    { threshold: 0.3 },
  ).observe(root);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      playing = false;
      paint();
      schedule();
    }
  });

  select(0);
}

for (const root of document.querySelectorAll<HTMLElement>('[data-usecases]')) setup(root);
