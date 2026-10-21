/**
 * The two screens of the demo, drawn into cell grids from a plain state:
 * Clank's console on the Monitor's Flow view (its header line, the menu column with page keys,
 * panels with their titles in the top border, the keys bar), and OpenCode's terminal interface.
 *
 * The layouts follow the console's own at each width (tests/console/snapshots in Clank's
 * repository): with room, the flow is drawn as boxes in rows; on a narrow screen, as a list.
 */
import { Grid, clip, pad, wrap } from './cells';

export type BoxState = 'done' | 'run' | 'wait' | 'fail' | 'you';

export interface Box {
  kind: string;
  title: string;
  who: string;
  meta: string;
  state: BoxState;
  tries?: number;
}

export interface Line {
  mark?: string;
  mk?: string;
  text: string;
  k?: string;
  sub?: string[];
}

export interface ClankState {
  clock: string;
  gateway: string;
  name: string;
  status: string;
  panelRight: string;
  panelRightK?: string;
  drawn: 'none' | 'draft' | 'flow';
  boxes: Record<string, Box>;
  tasks: string[];
  fail: 'idle' | 'red';
  failText: string;
  side: 'build' | 'run' | 'review';
  build: Line[];
  selected: { kind: string; st: BoxState; stText: string; title: string; rows: [string, string][] };
  live: { phase: string; ctx: number; guard: string };
  waiting: Line[];
  brief: Line[];
  keyFlash: string | null;
  spin: string;
}

export interface OcMsg {
  role: 'user' | 'model' | 'tool';
  text: string;
  tool?: string;
  tag?: string;
  tagK?: string;
}

export interface OcState {
  title: string;
  usage: string;
  msgs: OcMsg[];
  input: string;
  caret: boolean;
  busy: boolean;
  spin: string;
}

const MARK: Record<BoxState, [string, string]> = {
  done: ['✓', 'g'],
  run: ['●', 't'],
  wait: ['○', 'mu'],
  fail: ['✗', 'r'],
  you: ['◆', 'y'],
};

const MENU: [string, string, string?, string?][] = [
  ['F4', 'This folder', '✓', 'g'],
  ['1', 'Home'],
  ['2', 'Questions'],
  ['3', 'History'],
  ['4', 'Docker', '●', 'g'],
  ['5', 'Machine'],
  ['6', 'Operations'],
  ['7', 'Records'],
  ['8', 'Models', '●', 'g'],
  ['9', 'Presets'],
  ['0', 'Providers and models'],
  ['F1', 'Help'],
  ['F2', 'Launch options'],
  ['F3', 'MCP servers'],
  ['F6', 'Workspaces'],
  ['F7', 'Requests'],
  ['F8', 'CPU models'],
  ['F9', 'Phone'],
  ['F10', 'Monitor'],
];

const ORDER_A = ['you', 'plan', 'verify', 'decompose'];
const ORDER_B = ['integrate', 'gate'];

/** Clank's console, on the Monitor's Flow view. */
export function renderClank(s: ClankState, cols: number, rows: number): string {
  const g = new Grid(cols, rows);

  // The header line
  let x = 1;
  x += g.put(x, 0, '◆ CLANK', 'or') + 2;
  x += g.put(x, 0, 'my-api', 'mu') + 3;
  const clock = s.clock;
  const items: [string, string][] = [
    ['● service up 2h', 'g'],
    ['● docker running', 'g'],
    ['● your-model', 'g'],
    [s.gateway, 'g'],
  ];
  if (s.spin) items.push([`${s.spin} working`, 't']);
  for (const [t, k] of items) {
    if (x + t.length + 8 > cols) break;
    x += g.put(x, 0, t, k) + 2;
  }
  g.put(cols - clock.length - 1, 0, clock, 'mu');

  // The menu column: left out, so the flow being designed has the pane's whole width (the owner's call)
  const M = 0;
  if (M) {
    MENU.forEach(([key, label, mark, mk], i) => {
      const y = 1 + i;
      if (y >= rows - 2) return;
      const on = key === 'F10';
      const kk = on ? 'sel' : 'key';
      g.put(0, y, pad(key, key.length), kk);
      const room = M - key.length - 1 - (mark ? 3 : 1);
      g.put(key.length + 1, y, clip(label, room), on ? 'sel' : '');
      if (on) g.paint(0, y, M - 1, 'sel');
      if (mark) g.put(M - 3, y, mark, mk);
    });
    for (let y = 1; y < rows - 2; y++) g.put(M - 1, y, '│', 'ln');
  }

  const x0 = M ? M + 1 : 1;
  const cw = cols - x0 - 1;

  // The view's tabs and its first line
  let tx = x0;
  for (const tab of ['Flow', 'Session', 'Context']) {
    const t = ` ${tab} `;
    g.put(tx, 1, t, tab === 'Flow' ? 'sel' : 'mu');
    tx += t.length + 1;
  }
  const head = `flow “${s.name}” · ${s.status}`;
  g.put(x0, 2, clip(head, cw), 'mu');
  g.put(x0 + 5, 2, clip(`“${s.name}”`, Math.max(0, cw - 5)), 'wb');

  // The keys bar
  const keys: [string, string][] =
    s.drawn === 'flow' && s.side !== 'build'
      ? [['f10', 'next view'], ['enter', 'open'], ['p', 'pause'], ['e', 'edit the box'], ['o', 'open in VS Code'], ['r', 'run from here'], ['?', 'explain']]
      : [['f10', 'next view'], ['enter', 'open'], ['r', 'run'], ['e', 'edit a box'], ['n', 'new flow'], ['?', 'explain'], ['f1', 'help']];
  let kx = 1;
  for (const [key, label] of keys) {
    const need = key.length + label.length + 3;
    if (kx + need > cols) break;
    g.put(kx, rows - 1, key, s.keyFlash === key ? 'kf' : 'key');
    g.put(kx + key.length + 1, rows - 1, label, 'mu');
    kx += need;
  }

  // With fewer rows (a short window), the blank lines go first: under the view's first line, and over the keys.
  const roomy = rows >= 36;
  const top = roomy ? 4 : 3;
  const bottom = roomy ? rows - 2 : rows - 1;
  if (cw >= 66) wideBody(g, s, x0, cw, top, bottom, rows >= 33);
  else narrowBody(g, s, x0, cw, top, bottom);
  return g.html();
}

function drawBox(g: Grid, b: Box, x: number, y: number, w: number) {
  const style = b.state === 'run' ? 'heavy' : b.state === 'wait' ? 'dash' : 'solid';
  const k = b.state === 'run' ? 't' : b.state === 'done' ? 'g' : b.state === 'fail' ? 'r' : b.state === 'you' ? 'y' : b.kind === 'GATE' ? 'y' : 'ln';
  g.box(x, y, w, 6, { style, k });
  const inner = w - 4;
  const kind = b.kind + (b.tries && b.tries > 1 ? ` ⟲${b.tries}` : '');
  g.put(x + 2, y + 1, clip(kind, inner - 1), b.state === 'wait' ? 'hb' : 'wb');
  const [m, mk] = MARK[b.state];
  g.put(x + w - 2, y + 1, m, mk);
  g.put(x + 2, y + 2, clip(b.title, inner + 1), b.state === 'run' ? 'wb' : '');
  g.put(x + 2, y + 3, clip(b.who, inner + 1), 'mu');
  g.put(x + 2, y + 4, clip(b.meta, inner + 1), b.state === 'fail' ? 'r' : 'mu');
}

function arrow(g: Grid, x: number, y: number, done: boolean) {
  g.put(x, y, done ? '──▸' : '┄┄▸', done ? 'mu' : 'ln');
}

/**
 * The flow drawn as boxes, with the two panels under it. It needs 32 rows: the flow panel 18 (its
 * legend once it has 19), the panels 10, and a line between them only when there is room.
 */
function wideBody(g: Grid, s: ClankState, x0: number, cw: number, top: number, bottom: number, gapRow = true) {
  const sideH = bottom - top >= 32 ? 11 : 10;
  const between = gapRow ? 1 : 0;
  const flowH = Math.max(8, bottom - top - sideH - between);

  g.box(x0, top, cw, flowH, { title: 'Flow', right: s.panelRight, rk: s.panelRightK ?? 'mu' });
  const ix = x0 + 2;
  const iw = cw - 4;

  if (s.drawn === 'none') {
    g.put(ix, top + 2, 'No flow yet: the model drafts it in OpenCode,', 'mu');
    g.put(ix, top + 3, 'and Clank draws each draft here.', 'mu');
  } else {
    const gap = 3;
    const bw = Math.min(24, Math.floor((iw - gap * 3) / 4));
    const col = (i: number) => ix + i * (bw + gap);
    const yA = top + 1;
    ORDER_A.forEach((id, i) => {
      const b = s.boxes[id];
      drawBox(g, b, col(i), yA, bw);
      if (i < 3) arrow(g, col(i) + bw, yA + 1, b.state === 'done');
    });

    // VERIFY's fail line back to PLAN, under the boxes
    const fk = s.fail === 'red' ? 'r' : 'ln';
    const px = col(1) + 2;
    const vx = col(2) + bw - 3;
    g.put(px, yA + 5, '▴', fk);
    g.put(vx, yA + 5, '┬', fk);
    const lineY = yA + 6;
    g.put(px, lineY, '╰' + (s.fail === 'red' ? '─' : '┄').repeat(Math.max(0, vx - px - 1)) + '╯', fk);
    const label = ` ${s.failText} `;
    if (label.length < vx - px - 3) g.put(px + 2, lineY, label, s.fail === 'red' ? 'r' : 'mu');

    // From DECOMPOSE back to the start of the next row
    const dx = col(3) + bw - 3;
    const doneD = s.boxes.decompose.state === 'done';
    const wk = doneD ? 'mu' : 'ln';
    g.put(dx, yA + 5, '┬', wk);
    g.put(dx, lineY, '│', wk);
    const bx = col(0) + 2;
    g.put(bx, lineY + 1, '╭' + (doneD ? '─' : '┄').repeat(Math.max(0, dx - bx - 1)) + '╯', wk);
    g.put(bx, lineY + 2, '▾', wk);

    // The second row: the tasks, INTEGRATE, the final GATE, the next flow
    const yB = lineY + 3;
    drawTasks(g, s, col(0), yB, bw);
    const anyTaskDone = s.tasks.length > 0 && s.tasks.every((t) => s.boxes[t].state === 'done');
    arrow(g, col(0) + bw, yB + 1, anyTaskDone);
    ORDER_B.forEach((id, i) => {
      const b = s.boxes[id];
      drawBox(g, b, col(i + 1), yB, bw);
      arrow(g, col(i + 1) + bw, yB + 1, b.state === 'done');
    });
    const nx = col(3);
    g.box(nx, yB, bw, 6, { style: 'dash', k: 'ln' });
    const approved = s.boxes.gate.state === 'done';
    g.put(nx + 2, yB + 1, clip('▸ next flow', bw - 4), approved ? 'g' : 'mu');
    g.put(nx + 2, yB + 2, clip(approved ? 'made: its brief' : 'made when approved', bw - 3), 'mu');
    g.put(nx + 2, yB + 3, clip(approved ? 'from INTEGRATE' : 'brief from INTEGRATE', bw - 3), 'mu');

    const ly = top + flowH - 2;
    let lx = flowH >= 19 ? ix : ix + iw;
    for (const [m, k, t] of [
      ['✓', 'g', 'done'],
      ['●', 't', 'running'],
      ['○', 'mu', 'waiting'],
      ['✗', 'r', 'failed'],
      ['◆', 'y', 'waits for you'],
      ['┄┄', 'ln', 'not yet'],
    ]) {
      const need = m.length + t.length + 3;
      if (lx + need > ix + iw) break;
      g.put(lx, ly, m, k);
      g.put(lx + m.length + 1, ly, t, 'mu');
      lx += need;
    }
  }

  // The panels under the flow
  const sy = top + flowH + between;
  const half = Math.floor((cw - 2) / 2);
  sidePanel(g, s, x0, sy, half, sideH);
  waitingPanel(g, s, x0 + half + 2, sy, cw - half - 2, sideH);
}

function drawTasks(g: Grid, s: ClankState, x: number, y: number, w: number) {
  if (!s.tasks.length) {
    g.box(x, y, w, 6, { style: 'dash', k: 'ln' });
    g.put(x + 2, y + 1, 'TASKS', 'hb');
    g.put(x + w - 2, y + 1, '○', 'mu');
    g.put(x + 2, y + 2, clip('proposed by', w - 3), 'mu');
    g.put(x + 2, y + 3, clip('DECOMPOSE', w - 3), 'mu');
    return;
  }
  const n = s.tasks.length;
  const h = n * 2 + 1;
  const anyRun = s.tasks.some((t) => s.boxes[t].state === 'run');
  const allDone = s.tasks.every((t) => s.boxes[t].state === 'done');
  const k = anyRun ? 't' : allDone ? 'g' : 'ln';
  g.box(x, y, w, h, { style: anyRun || allDone ? 'solid' : 'dash', k });
  s.tasks.forEach((id, i) => {
    const b = s.boxes[id];
    const yy = y + 1 + i * 2;
    g.put(x + 2, yy, clip(`${b.kind} ${b.title}`, w - 5), b.state === 'run' ? 'tb' : b.state === 'done' ? '' : 'mu');
    const [m, mk] = MARK[b.state];
    g.put(x + w - 2, yy, m, mk);
    if (i < n - 1) g.put(x, yy + 1, '├' + '─'.repeat(w - 2) + '┤', k);
  });
}


function lines(g: Grid, list: Line[], x: number, y: number, w: number, maxY: number) {
  let yy = y;
  for (const l of list) {
    if (yy > maxY) return;
    let tx = x;
    if (l.mark) {
      g.put(x, yy, l.mark, l.mk ?? '');
      tx = x + 2;
    }
    for (const part of wrap(l.text, w - (tx - x))) {
      if (yy > maxY) return;
      g.put(tx, yy, part, l.k ?? '');
      yy++;
    }
    for (const sub of l.sub ?? []) {
      for (const part of wrap(sub, w - 4)) {
        if (yy > maxY) return;
        g.put(x + 4, yy, part, l.mk === 'r' ? 'r' : 'mu');
        yy++;
      }
    }
  }
}

function sidePanel(g: Grid, s: ClankState, x: number, y: number, w: number, h: number) {
  const iw = w - 4;
  const maxY = y + h - 2;
  if (s.side === 'build') {
    g.box(x, y, w, h, { title: 'Building it with the model' });
    lines(g, s.build, x + 2, y + 1, iw, maxY);
    return;
  }
  if (s.side === 'review') {
    const met = s.brief.filter((l) => l.mark === '✓').length;
    g.box(x, y, w, h, { title: 'The brief, checked', right: `${met} of ${s.brief.length} met` });
    lines(g, s.brief, x + 2, y + 1, iw, maxY);
    return;
  }
  const sel = s.selected;
  g.box(x, y, w, h, { title: 'Selected' });
  const [m, mk] = MARK[sel.st];
  let yy = y + 1;
  const hx = x + 2 + g.put(x + 2, yy, clip(sel.kind, iw), 'wb');
  g.put(hx, yy, clip(` · ${m} ${sel.stText}`, Math.max(0, x + w - 2 - hx)), mk);
  yy++;
  g.put(x + 2, yy++, clip(sel.title, iw), 'wb');
  for (const [key, val] of sel.rows) {
    if (yy > maxY - 3) break;
    g.put(x + 2, yy, pad(key, 7), 'mu');
    g.put(x + 10, yy, clip(val, iw - 8), sel.st === 'fail' && key.match(/^\d$/) ? 'r' : '');
    yy++;
  }
  yy = Math.max(yy, maxY - 2);
  g.put(x + 2, yy++, clip(`${s.spin ? s.spin + ' ' : ''}${s.live.phase}`, iw), s.spin ? 't' : 'mu');
  const bw = Math.max(6, Math.min(16, iw - 18));
  g.put(x + 2, yy, 'context ', 'mu');
  const full = Math.round((s.live.ctx / 100) * bw);
  g.put(x + 10, yy, '█'.repeat(full), 't');
  g.put(x + 10 + full, yy, '░'.repeat(Math.max(0, bw - full)), 'ln');
  g.put(x + 11 + bw, yy++, clip(`${Math.round(s.live.ctx)}%`, iw - bw - 9), '');
  g.put(x + 2, yy, 'guard   ', 'mu');
  g.put(x + 10, yy, clip(s.live.guard, iw - 8), 'g');
}

function waitingPanel(g: Grid, s: ClankState, x: number, y: number, w: number, h: number) {
  const gate = s.waiting.some((l) => l.mark === '◆');
  g.box(x, y, w, h, { title: 'Waiting for you', k: gate ? 'y' : 'ln' });
  lines(g, s.waiting, x + 2, y + 1, w - 4, y + h - 2);
}

function narrowBody(g: Grid, s: ClankState, x0: number, cw: number, top: number, bottom: number) {
  const list: Line[] = [];
  if (s.drawn === 'none') {
    list.push({ text: 'No flow yet: the model drafts it in OpenCode.', k: 'mu' });
  } else {
    const row = (id: string, indent = '') => {
      const b = s.boxes[id];
      const [m, mk] = MARK[b.state];
      list.push({ mark: indent + m, mk, text: `${b.kind}${b.tries && b.tries > 1 ? ' ⟲' + b.tries : ''} ${b.title}`, k: b.state === 'run' ? 'tb' : b.state === 'wait' ? 'mu' : '' });
    };
    row('you');
    row('plan');
    row('verify');
    list.push({ text: `   ${s.failText}`, k: s.fail === 'red' ? 'r' : 'mu' });
    row('decompose');
    if (s.tasks.length) s.tasks.forEach((t) => row(t, '   '));
    else list.push({ text: '   tasks: proposed by DECOMPOSE', k: 'mu' });
    row('integrate');
    row('gate');
  }
  const flowH = Math.min(list.length + 2, bottom - top - 9);
  g.box(x0, top, cw, flowH, { title: 'Flow', right: s.panelRight, rk: s.panelRightK ?? 'mu' });
  let y = top + 1;
  for (const l of list) {
    if (y > top + flowH - 2) break;
    if (l.mark) {
      const mark = l.mark.trimStart();
      const ind = l.mark.length - mark.length;
      g.put(x0 + 2 + ind, y, mark, l.mk ?? '');
      g.put(x0 + 4 + ind, y, clip(l.text, cw - 6 - ind), l.k ?? '');
    } else {
      g.put(x0 + 2, y, clip(l.text, cw - 4), l.k ?? '');
    }
    y++;
  }
  const sy = top + flowH + 1;
  const left = bottom - sy;
  const waitH = Math.min(6, Math.max(4, Math.floor(left / 2)));
  sidePanel(g, s, x0, sy, cw, left - waitH);
  waitingPanel(g, s, x0, bottom - waitH, cw, waitH);
}

/** OpenCode's terminal interface: the conversation, and its prompt at the bottom. */
export function renderOpenCode(s: OcState, cols: number, rows: number): string {
  const g = new Grid(cols, rows);
  g.put(1, 0, clip(s.title, cols - s.usage.length - 4), 'wb');
  g.put(cols - s.usage.length - 1, 0, s.usage, 'mu');
  g.put(0, 1, '─'.repeat(cols), 'ln');

  // The conversation, newest at the bottom
  const out: [string, string, string?, string?][] = [];
  const w = cols - 4;
  for (const m of s.msgs) {
    if (m.role === 'user') {
      out.push(['', '']);
      for (const l of wrap(m.text, w)) out.push(['┃ ' + l, 'ut']);
      out.push(['', '']);
    } else if (m.role === 'model') {
      if (out.length && out[out.length - 1][1] === 'mu') out.push(['', '']);
      for (const l of wrap(m.text, w)) out.push(['  ' + l, '']);
      out.push(['', '']);
    } else {
      const glyph = m.tool === 'read' ? '→' : m.tool === 'write' ? '←' : m.tool === 'search' ? '✱' : m.tool === 'bash' ? '$' : '⚙';
      out.push([`  ${glyph} ${m.text}`, 'mu', m.tag, m.tagK]);
    }
  }
  const promptH = 4;
  const area = rows - 2 - promptH - (s.busy ? 1 : 0);
  const shown = out.slice(Math.max(0, out.length - area));
  shown.forEach(([text, k, tag, tagK], i) => {
    const y = 2 + (area - shown.length) + i;
    if (k === 'ut') {
      g.put(1, y, '┃', 'p');
      g.put(3, y, clip(text.slice(2), cols - 4), 'ut');
      return;
    }
    const room = cols - 2 - (tag ? tag.length + 2 : 0);
    g.put(1, y, clip(text, room), k);
    if (tag) g.put(cols - tag.length - 1, y, tag, tagK ?? 'mu');
  });
  if (s.busy) g.put(1, rows - promptH - 1, clip(`${s.spin} working · esc interrupts`, cols - 2), 'mu');

  // The prompt
  const py = rows - promptH;
  for (let y = py; y < rows - 1; y++) {
    g.put(0, y, ' '.repeat(cols), 'ib');
    g.put(1, y, '┃', 'pb');
  }
  const typed = s.input || '';
  if (typed) {
    const last = wrap(typed, cols - 6).slice(-1)[0] ?? '';
    g.put(3, py, last, 'ibt');
    if (s.caret) g.put(3 + Array.from(last).length, py, '█', 'ibc');
  } else {
    g.put(3, py, clip('Ask anything…', cols - 6), 'ibm');
    if (s.caret) g.put(3, py, 'A', 'ibk');
  }
  g.put(3, py + 2, 'Plan', 'ibp');
  g.put(8, py + 2, clip('your-model · through Clank', cols - 10), 'ibm');
  g.put(1, rows - 1, clip('enter send  tab agents  ctrl+p commands', cols - 12), 'mu');
  g.put(cols - 9, rows - 1, '~/my-api', 'mu');
  return g.html();
}
