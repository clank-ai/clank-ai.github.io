/**
 * Still frames of Clank's console for the pages, drawn with the demo's cell grid at build time so
 * every border meets. Each one is a part of a real page of the console (tests/console/snapshots in
 * Clank's repository), with example names and numbers: no one's own model or measurements.
 */
import { Grid, clip, pad } from './demo/cells';
import { renderOpenCode } from './demo/views';

export interface Crop {
  html: string;
  cols: number;
}

type Part = [string, string?];

function row(g: Grid, x: number, y: number, parts: Part[]) {
  let xx = x;
  for (const [t, k] of parts) xx += g.put(xx, y, t, k ?? '');
  return xx;
}

function done(g: Grid): Crop {
  return { html: g.html(), cols: g.w };
}

function bar(n: number, of: number, k: string): Part[] {
  return [
    ['█'.repeat(n), k],
    ['░'.repeat(of - n), 'ln'],
  ];
}

/** The Monitor's Session view: the context window, what it does now, the Guide. */
export function session(): Crop {
  const g = new Grid(80, 17);
  row(g, 0, 0, [['OpenCode', 'wb'], [' · workspace my-api · “Add rate limits” · build · 19 steps', 'mu']]);
  g.box(0, 2, 80, 6, { title: 'Context window c' });
  g.paint(17, 2, 1, 'key');
  row(g, 2, 3, [['37,790 of 131,072 tokens (29%) · 60,514 left before OpenCode compacts', '']]);
  row(g, 2, 4, [...bar(22, 62, 't'), ['▒'.repeat(14), 'y']]);
  row(g, 2, 5, [['█', 'p'], [' system 3.3K  ', 'mu'], ['█', 'b'], [' tools 10.2K  ', 'mu'], ['█', 'y'], [' thinking 2.9K  ', 'mu'], ['█', 't'], [' results 18.6K  ', 'mu'], ['█', 'r'], [' loop 2.0K', 'mu']]);
  row(g, 2, 6, [['▒', 'y'], [' the margin: room kept for the next step\'s results', 'mu']]);

  g.box(0, 9, 39, 8, { title: 'Now n' });
  g.paint(7, 9, 1, 'key');
  row(g, 2, 10, [['⣾', 't'], [' writing a call · step 19', '']]);
  row(g, 2, 11, [['thinking ', 'mu'], ...bar(5, 10, 't'), [' 1,203 of 4,096', 'mu']]);
  row(g, 2, 12, [['output   ', 'mu'], ...bar(2, 10, 't'), [' 1,415 of 8,192', 'mu']]);
  row(g, 2, 13, [['writing  ', 'mu'], ['bash pytest tests/ -q', '']]);
  row(g, 2, 14, [['guard    ', 'mu'], ['watching', 'g'], [' · nothing repeats', 'mu']]);
  row(g, 2, 15, [['speed    ', 'mu'], ['shown live, as tokens come', 'mu']]);

  g.box(41, 9, 39, 8, { title: 'Guide g' });
  g.paint(50, 9, 1, 'key');
  const guide: [string, string, string][] = [
    ['.', 'Stop now', 'nothing read again'],
    ['m', 'Note', 'read at the next step'],
    ['p', 'Pause', 'after this step'],
    ['k', 'Compact now', 'reads the history once'],
    ['u', 'Undo turn', 'again: redo'],
    ['x', 'Drop', 'frees a tool result'],
  ];
  guide.forEach(([k, a, c], i) => row(g, 43, 10 + i, [[k, 'key'], [' ' + pad(a, 12), ''], [clip(c, 22), 'mu']]));
  return done(g);
}

/** The Monitor's Context view: what fills the window, part by part. */
export function context(): Crop {
  const g = new Grid(66, 11);
  g.box(0, 0, 66, 11, { title: 'What is in it', right: 'estimate' });
  row(g, 2, 1, [['part       tokens  share  ', 'mu'], ['the biggest', 'mu']]);
  const parts: [string, string, string, number, string][] = [
    ['p', 'system', '3,333', 9, 'the system prompt'],
    ['b', 'tools', '10,177', 27, "a tool's definition"],
    ['y', 'thinking', '2,915', 8, '15 items'],
    ['o', 'calls', '606', 2, '18 calls'],
    ['t', 'results', '18,624', 49, 'read src/api/server.py'],
    ['r', 'loop', '2,049', 5, 'text that repeats'],
  ];
  parts.forEach(([k, name, tok, share, big], i) => {
    const y = 2 + i;
    row(g, 2, y, [['█ ', k === 'o' ? 'or' : k], [pad(name, 9), ''], [tok.padStart(6), ''], [`${share}%`.padStart(6) + '  ', ''], [clip(big, 26), 'mu']]);
    row(g, 46, y, bar(Math.max(share > 0 ? 1 : 0, Math.round(share / 5)), 10, k === 'o' ? 'or' : k));
  });
  row(g, 2, 9, [['k', 'key'], [' compact now: frees about 22,700', 'mu']]);
  return done(g);
}

/** Requests (F7): one line per request, with its tokens and its cost. */
export function requests(): Crop {
  const g = new Grid(58, 8);
  g.box(0, 0, 58, 8, { title: 'Requests', right: 'F7' });
  g.paint(53, 0, 2, 'key');
  const rows: [string, string, string, string, string, string][] = [
    ['10:21:04', 'your-model', 'my-api', '31.2K', '0.9K', 'local'],
    ['10:21:31', 'your-model', 'my-api', '32.4K', '1.4K', 'local'],
    ['10:22:02', 'cloud: Example', 'docs', '18.0K', '0.6K', '$0.012'],
    ['10:22:40', 'your-model', 'my-api', '33.9K', '2.1K', 'local'],
    ['10:23:15', 'cloud: Example', 'docs', '19.1K', '0.8K', '$0.014'],
  ];
  row(g, 2, 1, [['time      model           where   in     out    cost', 'mu']]);
  rows.forEach(([t, m, w, i, o, c], n) =>
    row(g, 2, 2 + n, [[t + '  ', 'mu'], [pad(m, 16), ''], [pad(w, 8), 'mu'], [pad(i, 7), ''], [pad(o, 7), ''], [c, c === 'local' ? 'mu' : 'y']]),
  );
  return done(g);
}

/** The loop guard stopping an answer that repeats itself. */
export function loopGuard(): Crop {
  const g = new Grid(54, 9);
  g.box(0, 0, 54, 9, { title: 'Live text', right: 'step 17' });
  row(g, 2, 1, [['● being written · 412 tokens', 't']]);
  row(g, 2, 2, [['The grid needs three sizes: 16, 32 and 64.', '']]);
  row(g, 2, 3, [['The grid needs three sizes: 16, 32 and 64.', 'r']]);
  row(g, 2, 4, [['The grid needs three sizes: 16, 32 and 64.', 'r']]);
  row(g, 2, 5, [['The grid needs three sizes: 16, 32', 'r']]);
  row(g, 2, 7, [['✗ 12:04 the loop guard stopped step 17', 'r']]);
  return done(g);
}

/** Cloud cost: the header on every page, and one session's line in the Monitor. */
export function cost(): Crop {
  const g = new Grid(56, 7);
  row(g, 1, 0, [['◆ CLANK', 'or'], ['  docs  ', 'mu'], ['● cloud: Example Coder', 'g'], ['  ', ''], ['$0.42 today', 'y']]);
  g.box(0, 1, 56, 6, { title: 'Cloud spending', right: 'limits: $5 a day, $60 a month' });
  row(g, 2, 2, [['today       ', 'mu'], ...bar(3, 24, 'y'), ['  $0.42 of $5.00', '']]);
  row(g, 2, 3, [['this month  ', 'mu'], ...bar(1, 24, 'y'), ['  $3.10 of $60', '']]);
  row(g, 2, 4, [['this session: $0.18 · 21 requests', '']]);
  row(g, 2, 5, [['at a limit, cloud requests wait; local work goes on', 'mu']]);
  return done(g);
}

/** A flow as a list, the way the console draws it on a narrow screen. */
export function flowList(): Crop {
  const g = new Grid(52, 13);
  g.box(0, 0, 52, 13, { title: 'Flow', right: '6 done · 1 running · 2 waiting' });
  const lines: [string, string, string, string][] = [
    ['✓', 'g', 'YOU Your brief', 'BRIEF.md'],
    ['✓', 'g', 'PLAN ⟲2 Write the plan', 'PLAN.md'],
    ['✓', 'g', 'VERIFY ⟲2 Check the plan', 'pass, try 2'],
    ['', 'r', '   fail ⟲ back to PLAN with 2 findings', ''],
    ['✓', 'g', 'DECOMPOSE Break it into tasks', '3 tasks'],
    ['✓', 'g', '   TASK T1 The limiter', ''],
    ['●', 't', '   TASK T2 Its tests', ''],
    ['○', 'mu', '   TASK T3 The docs', ''],
    ['○', 'mu', 'INTEGRATE Put it together', ''],
    ['◆', 'y', 'GATE You review the whole', 'you decide'],
  ];
  lines.forEach(([m, k, t, meta], i) => {
    const y = 1 + i;
    const indent = t.startsWith('   ') ? 3 : 0;
    if (m) g.put(2 + indent, y, m, k);
    const text = t.trimStart();
    if (!m) {
      g.put(2, y, t, 'r');
      return;
    }
    const end = g.put(4 + indent, y, text, m === '●' ? 'tb' : m === '○' ? 'mu' : '');
    if (meta) g.put(6 + indent + end, y, clip(meta, 50 - 6 - indent - end), 'mu');
  });
  return done(g);
}

/** The building of a flow, as the console shows it while the model drafts. */
export function building(): Crop {
  const g = new Grid(52, 9);
  g.box(0, 0, 52, 9, { title: 'Building it with the model' });
  row(g, 2, 1, [['✓', 'g'], [' started by you (console) · 10:02', '']]);
  row(g, 2, 2, [['✓', 'g'], [' read the folder: 5 tool calls', '']]);
  row(g, 2, 3, [['✓', 'g'], [' BRIEF.md written · 10:05', '']]);
  row(g, 2, 4, [['✗', 'r'], [' draft 1 · 10:06 · refused: 1 problem', '']]);
  row(g, 6, 5, [['- T3 sees tests/test_limits.py, which no', 'r']]);
  row(g, 6, 6, [['  box before it writes', 'r']]);
  row(g, 2, 7, [['✓', 'g'], [' draft 2 · 10:07 · accepted', '']]);
  return done(g);
}

/** VERIFY's report, sending the plan back with numbered findings. */
export function verdict(): Crop {
  const g = new Grid(52, 8);
  g.box(0, 0, 52, 8, { title: "VERIFY's report", k: 'r' });
  row(g, 2, 1, [['✗ fail (try 1) · in a fresh session', 'r']]);
  row(g, 2, 2, [['It saw only BRIEF.md and PLAN.md.', 'mu']]);
  row(g, 2, 3, [['1', 'y'], ['  no test for the Retry-After header', '']]);
  row(g, 2, 4, [['2', 'y'], ['  the limit is not configurable', '']]);
  row(g, 2, 6, [['⟲ back to PLAN with both · try 2 of 3', 'mu']]);
  return done(g);
}

/** The final review: the brief checked, and the gate. */
export function review(): Crop {
  const g = new Grid(52, 9);
  g.box(0, 0, 52, 9, { title: 'Waiting for you', k: 'y' });
  row(g, 2, 1, [['◆', 'y'], [' GATE You review the whole', 'wb']]);
  row(g, 2, 2, [['✓', 'g'], [' 100 a minute per key, configurable', '']]);
  row(g, 2, 3, [['✓', 'g'], [' 429 with Retry-After', '']]);
  row(g, 2, 4, [['✓', 'g'], [' tests cover both, and pass', '']]);
  row(g, 2, 6, [['y', 'key'], [' approve  ', 'mu'], ['e', 'key'], [' edit  ', 'mu'], ['b', 'key'], [' send back  ', 'mu'], ['s', 'key'], [' stop', 'mu']]);
  return done(g);
}

/** A compact flow graph at one moment of its run, for the "how a flow runs" sequence. */
export function miniFlow(states: Record<string, 'done' | 'run' | 'wait' | 'fail' | 'you'>, failRed = false): Crop {
  const g = new Grid(44, 9);
  const mark = { done: ['✓', 'g'], run: ['●', 't'], wait: ['○', 'mu'], fail: ['✗', 'r'], you: ['◆', 'y'] } as const;
  const put = (id: string, label: string, x: number, y: number, w = 12) => {
    const st = states[id] ?? 'wait';
    const k = st === 'run' ? 't' : st === 'done' ? 'g' : st === 'fail' ? 'r' : st === 'you' ? 'y' : 'ln';
    g.box(x, y, w, 3, { style: st === 'run' ? 'heavy' : st === 'wait' ? 'dash' : 'solid', k });
    g.put(x + 2, y + 1, label, st === 'wait' ? 'mu' : st === 'run' ? 'tb' : 'wb');
    g.put(x + w - 2, y + 1, mark[st][0], mark[st][1]);
  };
  put('plan', 'PLAN', 0, 0);
  g.put(12, 1, '──▸', 'mu');
  put('verify', 'VERIFY', 15, 0);
  g.put(27, 1, '──▸', 'mu');
  put('tasks', 'TASKS', 30, 0);
  g.put(2, 3, '╰' + '─'.repeat(22) + '╯', failRed ? 'r' : 'ln');
  g.put(5, 3, ' fail ⟲ back ', failRed ? 'r' : 'mu');
  g.put(38, 3, '│', 'ln');
  g.put(16, 4, '╭' + '─'.repeat(21) + '╯', 'ln');
  g.put(16, 5, '▾', 'ln');
  put('integrate', 'INTEGRATE', 8, 6, 14);
  g.put(22, 7, '──▸', 'mu');
  put('gate', 'GATE', 25, 6);
  return done(g);
}

/** Add a model: the first screen when no model is usable. */
export function addModel(): Crop {
  const g = new Grid(64, 11);
  row(g, 1, 0, [['◆ CLANK', 'or'], ['  my-api  ', 'mu'], ['● service', 'g'], ['  ', ''], ['● docker', 'g'], ['  ', ''], ['● no model: Add a model', 'y']]);
  g.box(0, 1, 64, 9, { title: 'Add a model', right: 'F12' });
  row(g, 2, 2, [['How should Clank run its model?', 'wb']]);
  row(g, 2, 4, [[' c ', 'sel'], [' Cloud: a model at OpenRouter, with your key.', '']]);
  row(g, 6, 5, [['No GPU needed. Each request costs money, shown.', 'mu']]);
  row(g, 2, 6, [[' l ', 'sel'], [' Local: a model on this computer\'s GPU.', '']]);
  row(g, 6, 7, [['Nothing to pay per request; an engine and files.', 'mu']]);
  row(g, 1, 10, [['c', 'key'], [' cloud  ', 'mu'], ['l', 'key'], [' local  ', 'mu'], ['esc', 'key'], [' this folder  ', 'mu'], ['?', 'key'], [' explain', 'mu']]);
  return done(g);
}

/** Presets for the main slot, each with its fit on this GPU. */
export function presets(): Crop {
  const g = new Grid(64, 10);
  g.box(0, 0, 64, 10, { title: 'Local: a model on this computer', right: 'F12 · l' });
  const ps: [string, string, string, string][] = [
    ['your-model 128K', 'kvmem-llamacpp · fits: 13.9 of 15.9 GB', 'needs: the engine, the weights', 'y'],
    ['your-model 32K', 'llamacpp · fits: 12.6 of 15.9 GB', 'needs: the weights (11.3 GB)', 'y'],
    ['small-model 32K', 'llamacpp · fits: 6.1 of 15.9 GB', 'ready', 'g'],
  ];
  ps.forEach(([name, eng, need, k], i) => {
    const y = 1 + i * 3;
    if (i === 0) g.paint(1, y, 62, 'sel');
    row(g, 2, y, [[name, i === 0 ? 'sel' : 'wb']]);
    row(g, 4, y + 1, [[eng, 'mu']]);
    row(g, 4, y + 2, [[need, k]]);
  });
  return done(g);
}

/** The question asked once per workspace, before its agent first uses the cloud. */
export function consent(): Crop {
  const g = new Grid(56, 6);
  g.box(0, 0, 56, 6, { title: 'Clank asks', k: 'y' });
  row(g, 2, 1, [["Let my-api's agent use the cloud model?", 'wb']]);
  row(g, 2, 2, [['Its requests go to OpenRouter; Notion pages and', 'mu']]);
  row(g, 2, 3, [['local-only MCP servers never do.', 'mu']]);
  row(g, 2, 4, [['y', 'key'], [' allow   ', 'mu'], ['n', 'key'], [' keep local', 'mu']]);
  return done(g);
}

/** This folder (F4): what working here needs, a check for each step done. */
export function folder(): Crop {
  const g = new Grid(60, 11);
  g.box(0, 0, 60, 11, { title: 'This folder', right: 'F4 · ~/my-api' });
  const steps: [string, string, string][] = [
    ['✓', 'g', 'Docker running'],
    ['✓', 'g', "the folder's workspace: my-api"],
    ['✓', 'g', 'its software: pip install -e .[test]'],
    ['✓', 'g', 'a model: your-model, in the main slot'],
    ['✓', 'g', 'the gateway'],
  ];
  steps.forEach(([m, k, t], i) => row(g, 2, 1 + i, [[m, k], [' ' + t, '']]));
  row(g, 2, 7, [['Then work', 'wb']]);
  row(g, 2, 8, [['a', 'key'], [' start the agent here  ', 'mu'], ['c', 'key'], [' VS Code  ', 'mu'], ['f', 'key'], [' build a flow', 'mu']]);
  row(g, 2, 9, [['g', 'key'], [' does every step that is not done', 'mu']]);
  return done(g);
}

/** OpenCode at work in a folder, as the demo draws it: a request, the files it reads, the one it writes. */
export function agentAtWork(): Crop {
  const cols = 58;
  const html = renderOpenCode(
    {
      title: 'my-api · rate limits',
      usage: '9% · 11.8K',
      msgs: [
        { role: 'user', text: 'Add rate limits to the API, per key, with tests and docs.' },
        { role: 'model', text: 'I will read the server first, then add the limiter and its tests.' },
        { role: 'tool', tool: 'read', text: 'Read src/api/server.py' },
        { role: 'tool', tool: 'search', text: 'Grep "limit"', tag: '2 matches' },
        { role: 'tool', tool: 'write', text: 'Write src/api/limits.py', tag: '+42' },
      ],
      input: '',
      caret: false,
      busy: true,
      spin: '⣾',
      mode: 'Build',
    },
    cols,
    17,
  );
  return { html, cols };
}
