/**
 * The demo on the home page: someone builds a flow by talking with the model in OpenCode (left)
 * while Clank's console follows it (right), then runs it, box by box, to the final review.
 *
 * It plays when it scrolls into view and pauses when it leaves; the Pause button stops it for good
 * until Play. With prefers-reduced-motion it still plays, but each change appears whole: no typing,
 * no streaming, no fades. The chapters jump to a moment; the caption under it says what happens,
 * and the transcript below the caption lists every step for screen readers and anyone who prefers
 * to read.
 */
import { CAPTIONS, CHAPTERS } from './captions';
import { renderClank, renderOpenCode, type Box, type BoxState, type ClankState, type OcMsg, type OcState } from './views';

const SPIN = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];

interface State {
  clank: ClankState;
  oc: OcState;
}

function box(kind: string, title: string, who: string, meta: string, state: BoxState = 'wait'): Box {
  return { kind, title, who, meta, state };
}

function initial(): State {
  return {
    clank: {
      clock: '10:02',
      gateway: '● gateway',
      name: 'rate-limits',
      status: 'building with the model · workspace my-api',
      panelRight: '',
      drawn: 'none',
      boxes: {
        you: box('YOU', 'Your brief', 'you', 'BRIEF.md'),
        plan: box('PLAN', 'Write the plan', 'your-model', 'PLAN.md'),
        verify: box('VERIFY', 'Check the plan', 'your-model', 'a verdict'),
        decompose: box('DECOMPOSE', 'Break it into tasks', 'your-model', 'proposes tasks'),
        t1: box('T1', 'The limiter', 'your-model', 'src/api/limits.py'),
        t2: box('T2', 'Its tests', 'your-model', 'tests/test_limits.py'),
        t3: box('T3', 'The docs', 'your-model', 'docs/limits.md'),
        integrate: box('INTEGRATE', 'Put it together', 'your-model', 'SUMMARY.md'),
        gate: box('GATE', 'You review the whole', 'you', 'you decide'),
      },
      tasks: [],
      fail: 'idle',
      failText: 'fail ⟲ back',
      side: 'build',
      build: [{ mark: '✓', mk: 'g', text: 'started by you (console) · 10:02' }],
      selected: { kind: '', st: 'wait', stText: '', title: '', rows: [] },
      live: { phase: 'idle', ctx: 0, guard: 'watching · nothing repeats' },
      waiting: [{ mark: '?', mk: 'y', text: 'talk with the model in OpenCode, on “rate-limits · building the flow”' }],
      brief: [],
      keyFlash: null,
      spin: '',
    },
    oc: {
      title: 'rate-limits · building the flow',
      usage: '6% · 7.9K',
      msgs: [
        { role: 'user', text: 'Clank: build a flow for this folder with its owner. Read the folder, ask what you need, write BRIEF.md together, then send the flow with flow_draft. (Clank\'s first message, in full in first-message.md)' },
        { role: 'model', text: 'I will read the folder, then ask what I need to know. What should the flow do?' },
      ],
      input: '',
      caret: true,
      busy: false,
      spin: '',
    },
  };
}

interface Step {
  caption: string;
  run: (c: Ctx) => Promise<void>;
}

class Cancelled extends Error {}

interface Ctx {
  s: State;
  instant: boolean;
  wait(ms: number): Promise<void>;
  type(text: string): Promise<void>;
  say(text: string): Promise<void>;
  tool(m: OcMsg, then?: () => void): Promise<void>;
  work(id: string, steps: [number, number], ctx: [number, number], ms: number): Promise<void>;
  key(k: string): Promise<void>;
  draw(): void;
}

/** What each box sees and writes, for the Selected panel. */
const IO: Record<string, [string, string]> = {
  plan: ['BRIEF.md', 'PLAN.md'],
  verify: ['BRIEF.md, PLAN.md', 'a verdict'],
  decompose: ['BRIEF.md, PLAN.md', 'proposed tasks'],
  t1: ['PLAN.md', 'src/api/limits.py'],
  t2: ['PLAN.md, limits.py', 'tests/test_limits.py'],
  t3: ['PLAN.md, T1 and T2', 'docs/limits.md'],
  integrate: ['every deliverable', 'SUMMARY.md, NEXT.md'],
};

function selectedFor(c: ClankState, id: string, st: BoxState, stText: string, rows: [string, string][]) {
  const b = c.boxes[id];
  const kind = b.kind.startsWith('T') && b.kind.length <= 3 ? `TASK ${b.kind}` : b.kind;
  c.selected = { kind: kind + (b.tries && b.tries > 1 ? ` ⟲${b.tries}` : ''), st, stText, title: b.title, rows };
}

const STEPS: Step[] = [
  {
    caption: CAPTIONS[0],
    run: async (c) => {
      await c.wait(1800);
    },
  },
  {
    caption: CAPTIONS[1],
    run: async (c) => {
      await c.type('Add rate limits to the API, per key, with tests and docs.');
      c.s.oc.busy = true;
      c.draw();
      await c.wait(600);
    },
  },
  {
    caption: CAPTIONS[2],
    run: async (c) => {
      const k = c.s.clank;
      k.build.push({ mark: '●', mk: 't', text: 'reading the folder: 0 tool calls so far' });
      k.spin = '⣾';
      const calls: OcMsg[] = [
        { role: 'tool', tool: 'read', text: 'Read README.md' },
        { role: 'tool', tool: 'search', text: 'Glob src/**/*.py', tag: '14 files' },
        { role: 'tool', tool: 'read', text: 'Read src/api/server.py' },
        { role: 'tool', tool: 'read', text: 'Read tests/test_api.py' },
        { role: 'tool', tool: 'search', text: 'Grep "limit"', tag: '2 matches' },
      ];
      for (let i = 0; i < calls.length; i++) {
        await c.tool(calls[i], () => {
          k.build[1].text = `reading the folder: ${i + 1} tool call${i ? 's' : ''} so far`;
        });
      }
    },
  },
  {
    caption: CAPTIONS[3],
    run: async (c) => {
      const k = c.s.clank;
      await c.say('Two questions before I write the brief:\n1. The default limit: how many requests a minute, per key?\n2. A refused request: 429 with a Retry-After header?');
      c.s.oc.busy = false;
      k.spin = '';
      k.build[1] = { mark: '✓', mk: 'g', text: 'read the folder: 5 tool calls' };
      k.build.push({ mark: '?', mk: 'y', text: 'the model asks you, in OpenCode' });
      k.waiting = [{ mark: '?', mk: 'y', text: 'the model asks you two questions, in OpenCode' }];
      c.draw();
      await c.wait(1600);
    },
  },
  {
    caption: CAPTIONS[4],
    run: async (c) => {
      const k = c.s.clank;
      await c.type('100 a minute, configurable. Yes, 429 with Retry-After.');
      c.s.oc.busy = true;
      k.spin = '⣾';
      k.build.pop();
      k.waiting = [{ mark: '✓', mk: 'g', text: 'Nothing waits for you.' }];
      c.draw();
      await c.wait(500);
      await c.tool({ role: 'tool', tool: 'write', text: 'Write BRIEF.md', tag: '18 lines' }, () => {
        k.clock = '10:05';
        k.build.push({ mark: '✓', mk: 'g', text: 'BRIEF.md written · 10:05' });
      });
    },
  },
  {
    caption: CAPTIONS[5],
    run: async (c) => {
      const k = c.s.clank;
      await c.tool({ role: 'tool', tool: 'mcp', text: 'flow_draft  draft 1', tag: 'refused: 1 problem', tagK: 'r' }, () => {
        k.clock = '10:06';
        k.drawn = 'draft';
        k.name = 'Rate limits for the API';
        k.panelRight = 'DRAFT 1 · refused: 1 problem';
        k.panelRightK = 'r';
        k.build.push({
          mark: '✗',
          mk: 'r',
          text: 'draft 1 · 10:06 · refused: 1 problem',
          sub: ['- T3 sees tests/test_limits.py, which no box before it writes'],
        });
      });
      await c.wait(900);
      await c.say('T2 writes the tests, so T3 now comes after it. Sending the flow again.');
    },
  },
  {
    caption: CAPTIONS[6],
    run: async (c) => {
      const k = c.s.clank;
      await c.tool({ role: 'tool', tool: 'mcp', text: 'flow_draft  draft 2', tag: 'accepted', tagK: 'g' }, () => {
        k.clock = '10:07';
        k.drawn = 'flow';
        k.panelRight = '7 waiting';
        k.panelRightK = 'mu';
        k.status = 'workspace my-api · not run yet';
        k.build.splice(k.build.length - 1, 1, { mark: '✗', mk: 'r', text: 'draft 1 · refused: 1 problem' }, { mark: '✓', mk: 'g', text: 'draft 2 · 10:07 · accepted' });
        k.waiting = [
          { mark: '?', mk: 'y', text: 'Built with the model: look, then r to run.' },
          { text: 'r runs it from its brief to your review, asking nothing else on the way.', k: 'mu' },
        ];
      });
      k.spin = '';
      await c.say('The flow is ready: 9 boxes, from the brief to your review. Look it over in Clank, then press r.');
      c.s.oc.busy = false;
      c.draw();
      await c.wait(1800);
    },
  },
  {
    caption: CAPTIONS[7],
    run: async (c) => {
      const k = c.s.clank;
      await c.key('r');
      k.clock = '10:08';
      k.status = 'workspace my-api · run 1 · started 10:08 · running: PLAN';
      k.side = 'run';
      k.boxes.you.state = 'done';
      k.boxes.you.meta = 'BRIEF.md · 10:05';
      k.waiting = [
        { mark: '✓', mk: 'g', text: 'Nothing waits for you.' },
        { text: 'next: GATE You review the whole. It asks here and in VS Code.', k: 'mu' },
      ];
      await c.work('plan', [1, 9], [3, 21], 3600);
      k.boxes.plan.state = 'done';
      k.boxes.plan.meta = 'PLAN.md · 10:12';
      c.draw();
    },
  },
  {
    caption: CAPTIONS[8],
    run: async (c) => {
      const k = c.s.clank;
      k.clock = '10:12';
      await c.work('verify', [1, 3], [2, 6], 2400);
      k.boxes.verify.state = 'fail';
      k.boxes.verify.meta = 'fail, try 1 · 10:13';
      k.fail = 'red';
      k.failText = 'fail ⟲ 2 findings · back to PLAN';
      selectedFor(k, 'verify', 'fail', 'fail, try 1', [
        ['saw', 'BRIEF.md, PLAN.md'],
        ['1', 'no test for the Retry-After header'],
        ['2', 'the limit is not configurable'],
      ]);
      k.live.phase = 'done · the verdict is fail';
      c.draw();
      await c.wait(2600);
    },
  },
  {
    caption: CAPTIONS[9],
    run: async (c) => {
      const k = c.s.clank;
      k.boxes.plan.tries = 2;
      k.fail = 'idle';
      k.failText = 'fail ⟲ 2 findings · 2 of 3 tries';
      k.boxes.verify.state = 'wait';
      k.boxes.verify.meta = 'a verdict';
      await c.work('plan', [1, 6], [4, 17], 2400);
      k.boxes.plan.state = 'done';
      k.boxes.plan.meta = 'PLAN.md, try 2';
      k.boxes.verify.tries = 2;
      await c.work('verify', [1, 3], [2, 6], 1800);
      k.boxes.verify.state = 'done';
      k.boxes.verify.meta = 'pass, try 2 · 10:19';
      k.clock = '10:19';
      c.draw();
      await c.wait(800);
    },
  },
  {
    caption: CAPTIONS[10],
    run: async (c) => {
      const k = c.s.clank;
      await c.work('decompose', [1, 4], [3, 9], 1800);
      k.boxes.decompose.state = 'done';
      k.boxes.decompose.meta = '3 tasks · 10:21';
      k.tasks = ['t1', 't2', 't3'];
      k.clock = '10:21';
      c.draw();
      await c.wait(700);
      for (const [id, done, clock] of [
        ['t1', 'src/api/limits.py', '10:26'],
        ['t2', 'tests/test_limits.py', '10:31'],
        ['t3', 'docs/limits.md', '10:34'],
      ]) {
        await c.work(id, [1, 7], [3, 16], 1500);
        k.boxes[id].state = 'done';
        k.boxes[id].meta = done;
        k.clock = clock;
        c.draw();
      }
      await c.work('integrate', [1, 5], [4, 13], 1600);
      k.boxes.integrate.state = 'done';
      k.boxes.integrate.meta = 'SUMMARY.md · 10:37';
      c.draw();
    },
  },
  {
    caption: CAPTIONS[11],
    run: async (c) => {
      const k = c.s.clank;
      k.clock = '10:37';
      k.spin = '';
      k.boxes.gate.state = 'you';
      k.boxes.gate.meta = 'waits for you';
      k.status = 'workspace my-api · run 1 · waiting for you: GATE';
      k.panelRight = '8 done · 1 waits for you';
      k.side = 'review';
      k.brief = [
        { mark: '✓', mk: 'g', text: 'a limit per key: 100 a minute, configurable' },
        { mark: '✓', mk: 'g', text: 'a refused request gets 429 and Retry-After' },
        { mark: '✓', mk: 'g', text: 'tests cover both, and pass' },
        { mark: '✓', mk: 'g', text: 'docs/limits.md says how to change it' },
      ];
      k.waiting = [
        { mark: '◆', mk: 'y', text: 'GATE You review the whole', k: 'wb' },
        { text: 'y approve  e edit  b send back  s stop', k: 'b' },
        { text: 'SUMMARY.md and 3 files changed; d shows each difference.', k: 'mu' },
      ];
      c.draw();
      await c.wait(3200);
      await c.key('y');
      k.boxes.gate.state = 'done';
      k.boxes.gate.meta = 'approved 10:41';
      k.clock = '10:41';
      k.status = 'workspace my-api · run 1 · done 10:41';
      k.panelRight = '9 done';
      k.waiting = [
        { mark: '✓', mk: 'g', text: 'Approved. The next flow is made from INTEGRATE\'s brief.' },
        { text: 'It waits for you to start it.', k: 'mu' },
      ];
      c.draw();
      await c.wait(4200);
    },
  },
];

/** Starts the demo in the element marked data-split-demo. */
function init(root: HTMLElement) {
  const ocPane = root.querySelector<HTMLElement>('[data-pane="opencode"]')!;
  const clankPane = root.querySelector<HTMLElement>('[data-pane="clank"]')!;
  const caption = root.querySelector<HTMLElement>('[data-caption]')!;
  const toggle = root.querySelector<HTMLButtonElement>('[data-toggle]')!;
  const toggleLabel = root.querySelector<HTMLElement>('[data-toggle-label]')!;
  const chapterButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-chapter]'));
  const frame = root.querySelector<HTMLElement>('[data-frame]')!;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let instantText = reduce.matches;
  reduce.addEventListener('change', () => (instantText = reduce.matches));

  let s = initial();
  let runId = 0;
  let userPaused = false;
  let visible = false;
  let started = false;
  let release: (() => void) | null = null;
  let gate: Promise<void> | null = null;
  let spinTimer = 0;
  let spinFrame = 0;

  // ---- Drawing ----

  const size = { oc: { cols: 60, rows: 38 }, clank: { cols: 100, rows: 38 } };
  function measure() {
    const probe = document.createElement('span');
    probe.textContent = '0000000000';
    probe.className = 'probe';
    clankPane.appendChild(probe);
    const cw = probe.getBoundingClientRect().width / 10 || 7;
    probe.remove();
    const split = root.dataset.layout === 'split';
    // A pane caught mid-layout (no width yet) keeps the size it had.
    if (clankPane.clientWidth < 120 || ocPane.clientWidth < 120) return;
    const cols = (el: HTMLElement) => {
      const cs = getComputedStyle(el);
      const inner = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      return Math.max(30, Math.floor((inner - 1) / cw));
    };
    size.clank.cols = cols(clankPane);
    size.oc.cols = cols(ocPane);
    size.clank.rows = size.clank.cols < 66 ? 36 : 38;
    size.oc.rows = split ? size.clank.rows : 20;
  }

  let queued = false;
  function draw() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      clankPane.innerHTML = `<pre class="cells">${renderClank(s.clank, size.clank.cols, size.clank.rows)}</pre>`;
      ocPane.innerHTML = `<pre class="cells">${renderOpenCode(s.oc, size.oc.cols, size.oc.rows)}</pre>`;
    });
  }

  function setLayout() {
    root.dataset.layout = root.clientWidth >= 1000 ? 'split' : 'stack';
    measure();
    draw();
  }
  const resize = new ResizeObserver(() => setLayout());
  resize.observe(root);
  resize.observe(clankPane);
  setLayout();
  void document.fonts?.ready.then(() => setLayout());

  // ---- Time ----

  const playing = () => !userPaused && visible && !document.hidden;

  function update() {
    if (playing()) {
      if (release) {
        release();
        release = null;
        gate = null;
      }
      if (!spinTimer && !instantText) {
        spinTimer = window.setInterval(() => {
          spinFrame = (spinFrame + 1) % SPIN.length;
          if (s.clank.spin) s.clank.spin = SPIN[spinFrame];
          if (s.oc.busy) s.oc.spin = SPIN[spinFrame];
          s.oc.caret = s.oc.busy ? false : spinFrame % 4 < 2;
          if (s.clank.spin || s.oc.busy || !s.oc.busy) draw();
        }, 110);
      }
    } else {
      if (!gate) gate = new Promise((resolve) => (release = resolve));
      if (spinTimer) {
        window.clearInterval(spinTimer);
        spinTimer = 0;
      }
    }
    toggle.toggleAttribute('data-paused', userPaused);
    toggleLabel.textContent = userPaused ? 'Play' : 'Pause';
    toggle.setAttribute('aria-label', userPaused ? 'Play the demo' : 'Pause the demo');
  }

  function makeCtx(id: number, instant: boolean): Ctx {
    const check = () => {
      if (id !== runId) throw new Cancelled();
    };
    const sleep = async (ms: number) => {
      check();
      while (gate) await gate;
      check();
      await new Promise((r) => window.setTimeout(r, ms));
      while (gate) await gate;
      check();
    };
    const ctx: Ctx = {
      s,
      instant,
      draw,
      async wait(ms) {
        if (instant) return;
        await sleep(ms);
      },
      async type(text) {
        if (instant || instantText) {
          s.oc.input = text;
          draw();
          await ctx.wait(900);
        } else {
          for (let i = 1; i <= text.length; i++) {
            s.oc.input = text.slice(0, i);
            draw();
            await sleep(28 + Math.random() * 42);
          }
          await ctx.wait(450);
        }
        s.oc.msgs.push({ role: 'user', text });
        s.oc.input = '';
        draw();
      },
      async say(text) {
        const msg: OcMsg = { role: 'model', text: '' };
        s.oc.msgs.push(msg);
        if (instant || instantText) {
          msg.text = text;
          draw();
          await ctx.wait(700);
          return;
        }
        let i = 0;
        while (i < text.length) {
          i = Math.min(text.length, i + 2 + Math.floor(Math.random() * 5));
          msg.text = text.slice(0, i);
          draw();
          await sleep(22 + Math.random() * 30);
        }
      },
      async tool(m, then) {
        s.oc.msgs.push(m);
        then?.();
        draw();
        await ctx.wait(520);
      },
      async work(boxId, steps, context, ms) {
        const k = s.clank;
        const b = k.boxes[boxId];
        const tryNo = b.tries ?? 1;
        b.state = 'run';
        b.meta = b.kind === 'VERIFY' ? `checking, try ${tryNo}` : `try ${tryNo} · working`;
        k.spin = SPIN[spinFrame];
        k.status = `workspace my-api · run 1 · started 10:08 · running: ${b.kind}`;
        k.panelRight = `${Object.values(k.boxes).filter((x) => x.state === 'done').length} done · 1 running`;
        const [sees, writes] = IO[boxId] ?? ['', ''];
        selectedFor(k, boxId, 'run', 'running', [
          ['model', b.who],
          ['sees', boxId === 'plan' && tryNo > 1 ? 'BRIEF.md, 2 findings' : sees],
          ['writes', writes],
        ]);
        const ticks = instant ? 1 : Math.max(1, Math.round(ms / 300));
        for (let t = 1; t <= ticks; t++) {
          const f = t / ticks;
          k.live.phase = `answering · step ${Math.round(steps[0] + (steps[1] - steps[0]) * f)}`;
          k.live.ctx = context[0] + (context[1] - context[0]) * f;
          draw();
          await ctx.wait(ms / ticks);
        }
        k.spin = '';
      },
      async key(k) {
        s.clank.keyFlash = k;
        draw();
        await ctx.wait(650);
        s.clank.keyFlash = null;
        draw();
      },
    };
    return ctx;
  }

  function chapterAt(index: number) {
    let ch = 0;
    CHAPTERS.forEach((c, i) => {
      if (c.step <= index) ch = i;
    });
    return ch;
  }

  function showStep(index: number) {
    caption.textContent = STEPS[index].caption;
    const ch = chapterAt(index);
    chapterButtons.forEach((b, i) => (i === ch ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
  }

  async function play(from: number) {
    const id = ++runId;
    s = initial();
    // Arrive at the chosen moment at once, then play on from there.
    for (let i = 0; i < from; i++) {
      try {
        await STEPS[i].run(makeCtx(id, true));
      } catch (e) {
        if (e instanceof Cancelled) return;
        throw e;
      }
    }
    s.oc.busy = false;
    s.clank.spin = '';
    draw();
    try {
      for (;;) {
        for (let i = from; i < STEPS.length; i++) {
          showStep(i);
          await STEPS[i].run(makeCtx(id, false));
        }
        // Start over
        if (!instantText) frame.classList.add('restarting');
        await makeCtx(id, false).wait(450);
        frame.classList.remove('restarting');
        s = initial();
        from = 0;
        draw();
      }
    } catch (e) {
      if (!(e instanceof Cancelled)) throw e;
    }
  }

  function start(from = 0) {
    started = true;
    void play(from);
  }

  toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    update();
    if (!started && playing()) start();
  });

  chapterButtons.forEach((button, i) => {
    button.addEventListener('click', () => {
      const index = CHAPTERS[i].step;
      showStep(index);
      start(index);
      update();
    });
  });

  document.addEventListener('visibilitychange', update);
  new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting);
      update();
      if (visible && !started && playing()) start();
    },
    { threshold: 0.3 },
  ).observe(frame);

  showStep(0);
  update();
}

const root = document.querySelector<HTMLElement>('[data-split-demo]');
if (root) init(root);
