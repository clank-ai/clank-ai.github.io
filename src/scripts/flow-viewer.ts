/**
 * Home's flow viewer (src/components/flow/FlowViewer.astro): the recorded run played event by event. Each step shows
 * the next event: its box lights up in the diagram (running, passed, failed, done), the line it came by, its bar on
 * the timeline and the playhead, and its line in "What each box did"; the answer is lit at the end.
 *
 * It plays from the start once it comes into view and pauses while it is out of view or the tab is hidden. With
 * prefers-reduced-motion it does not play by itself: the page keeps the finished run, and the controls step through
 * it. Each event shows long enough to read its excerpt (1.3 to 4.2 seconds, by its length; a long run faster, to play in
 * about two and a half minutes).
 */
import { clock, replay, stateClass, stateWords, type TraceEvent } from './flow-play';

interface Player {
  end: number;
  boxes: string[];
  lines: { from: string; to: string }[];
  events: TraceEvent[];
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

function setup(root: HTMLElement) {
  const data = JSON.parse(root.dataset.player ?? '{}') as Player;
  const n = data.events.length;
  const range = root.querySelector<HTMLInputElement>('[data-range]');
  const time = root.querySelector<HTMLElement>('[data-time]');
  const log = root.querySelector<HTMLElement>('[data-log]');
  const items = [...root.querySelectorAll<HTMLElement>('[data-log] > li')];
  const bars = [...root.querySelectorAll<HTMLElement>('.tl-bar')];
  const marks = [...root.querySelectorAll<HTMLElement>('.tl-mark')];
  const head = root.querySelector<HTMLElement>('[data-head]');
  const result = root.querySelector<HTMLElement>('[data-result]');
  const playButton = root.querySelector<HTMLButtonElement>('[data-act="play"]');
  const playWord = root.querySelector<HTMLElement>('[data-play-word]');
  if (!range || !log || !playButton) return;

  let at = n; // how many events are shown
  let playing = false;
  let timer = 0;
  let seen = false; // it has come into view once
  let inView = false;
  let resume = false; // it was playing when it went out of view, or the tab was hidden

  const pct = (t: number) => `${((100 * t) / data.end).toFixed(3)}%`;

  function draw() {
    const state = replay(data.boxes, data.lines, data.events, at);
    for (const box of root.querySelectorAll<SVGGElement>('[data-box]')) {
      const s = state.boxes[box.dataset.box ?? ''];
      if (!s) continue;
      box.classList.remove('is-wait', 'is-run', 'is-done', 'is-pass', 'is-fail');
      box.classList.add(stateClass(s));
      const words = box.querySelector('[data-state]');
      if (words) words.textContent = stateWords(s);
    }
    for (const line of root.querySelectorAll<SVGGElement>('[data-line]')) {
      line.classList.toggle('is-taken', state.taken.includes(line.dataset.line ?? ''));
      line.classList.toggle('is-now', at < n && state.now === line.dataset.line);
    }
    const now = at === 0 ? 0 : data.events[at - 1].t;
    items.forEach((item, i) => {
      item.classList.toggle('later', i >= at);
      item.classList.toggle('now', i === at - 1 && root.classList.contains('started'));
    });
    log!.scrollTop = log!.scrollHeight;
    for (const bar of bars) {
      const i0 = Number(bar.dataset.i0);
      const i1 = Number(bar.dataset.i1);
      bar.classList.toggle('later', i0 >= at);
      if (i0 < at && i1 >= at) bar.style.width = `max(3px, ${pct(Math.max(0, now - Number(bar.dataset.t0)))})`;
      else bar.style.width = `max(3px, ${pct(Number(bar.dataset.t1) - Number(bar.dataset.t0))})`;
    }
    for (const mark of marks) mark.classList.toggle('later', Number(mark.dataset.i) >= at);
    if (head) head.style.left = pct(now);
    result?.classList.toggle('later', at < n);
    if (time) time.textContent = clock(now);
    range!.value = String(at);
    range!.setAttribute('aria-valuetext', at ? `event ${at} of ${n}, at ${clock(now)}` : 'before the first event');
  }

  // Each event long enough to read its excerpt; a long run faster, so the whole plays in about two and a half minutes.
  const raw = items.map((item) => Math.min(4200, Math.max(1300, 900 + (item.querySelector('.ev-text')?.textContent ?? '').length * 26)));
  const scale = Math.min(1, 150000 / Math.max(1, raw.reduce((a, b) => a + b, 0)));

  function dwell(i: number): number {
    return Math.max(500, (raw[i] ?? 1300) * scale);
  }

  function step() {
    if (at >= n) {
      pause();
      return;
    }
    at += 1;
    draw();
    timer = window.setTimeout(step, at >= n ? 0 : dwell(at - 1));
  }

  function show(on: boolean) {
    playing = on;
    root.classList.toggle('playing', on);
    playButton!.setAttribute('aria-label', on ? 'Pause' : 'Play');
    if (playWord) playWord.textContent = on ? 'Pause' : 'Play';
  }

  function play() {
    window.clearTimeout(timer);
    if (at >= n) at = 0;
    root.classList.add('started');
    show(true);
    draw();
    timer = window.setTimeout(step, at === 0 ? 700 : dwell(at - 1));
  }

  function pause() {
    window.clearTimeout(timer);
    show(false);
  }

  function jump(to: number) {
    pause();
    resume = false;
    root.classList.add('started');
    at = Math.max(0, Math.min(n, to));
    draw();
  }

  playButton.addEventListener('click', () => {
    resume = false;
    if (playing) pause();
    else play();
  });
  root.querySelector('[data-act="restart"]')?.addEventListener('click', () => {
    jump(0);
  });
  root.querySelector('[data-act="back"]')?.addEventListener('click', () => jump(at - 1));
  root.querySelector('[data-act="next"]')?.addEventListener('click', () => jump(at + 1));
  range.addEventListener('input', () => jump(Number(range.value)));

  // Plays by itself once it is in view, from the start; never with reduced motion.
  if (!reduced.matches) {
    at = 0;
    draw();
  }
  const watcher = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (entry.isIntersecting) {
        if (!seen && !reduced.matches) {
          seen = true;
          play();
        } else if (resume) {
          resume = false;
          play();
        }
      } else if (playing) {
        resume = true;
        pause();
      }
    },
    { threshold: 0.35 },
  );
  watcher.observe(root);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) {
      resume = true;
      pause();
    } else if (!document.hidden && resume && inView) {
      resume = false;
      play();
    }
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      resume = false;
      pause();
      at = n;
      draw();
    }
  });
}

for (const root of document.querySelectorAll<HTMLElement>('[data-flow-viewer]')) setup(root);
