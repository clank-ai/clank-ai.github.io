/**
 * A flow's boxes and lines laid out as a small diagram, at build time: the boxes in columns by how far along the flow
 * they are (a row on a wide screen, a column on a narrow one), the lines between them, and a fail line drawn back
 * underneath (or beside) the boxes, as the console's Flow view draws it ("fail ⟲ back"). Any flow of the trace's shape
 * lays out: a line that points back to a box listed earlier is drawn as a line back.
 */
import type { FlowTrace } from '../data/captures';

export type Orientation = 'row' | 'column';

export interface LaidBox {
  id: string;
  type: string;
  title: string[];
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LaidLine {
  key: string;
  from: string;
  to: string;
  when: 'pass' | 'fail' | null;
  back: boolean;
  d: string;
  label?: { x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end' };
}

export interface Layout {
  boxes: LaidBox[];
  lines: LaidLine[];
  width: number;
  height: number;
  /** How many boxes the row holds side by side: the page keeps a long row only on a wide screen. */
  across: number;
}

const SIZE = {
  row: { w: 188, h: 92, gx: 64, gy: 26, pad: 6, lane: 46 },
  column: { w: 300, h: 78, gx: 24, gy: 44, pad: 6, lane: 54 },
} as const;
const CHAR = 7.4; // about one character of the title's font, in the diagram's units

/** A title in lines that fit the box, at most two; the second cut with an ellipsis. */
function wrapTitle(title: string, width: number): string[] {
  const most = Math.max(8, Math.floor((width - 30) / CHAR));
  const lines: string[] = [];
  let line = '';
  for (const word of title.split(/\s+/)) {
    if (!line) line = word;
    else if ((line + ' ' + word).length <= most) line += ' ' + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > 2) lines.splice(1, lines.length - 1, lines.slice(1).join(' '));
  return lines.map((each) => (each.length > most ? each.slice(0, most - 1) + '…' : each));
}

/** The line's key, as the page and the replay name it. */
export function lineKey(from: string, to: string): string {
  return `${from}>${to}`;
}

export function layout(flow: FlowTrace['flow'], orientation: Orientation): Layout {
  const s = SIZE[orientation];
  const order = new Map(flow.boxes.map((box, index) => [box.id, index]));
  const isBack = (line: { from: string; to: string }) => (order.get(line.to) ?? 0) <= (order.get(line.from) ?? 0);

  // How far along each box is: the longest way to it over the lines forward.
  const rank = new Map(flow.boxes.map((box) => [box.id, 0]));
  for (let pass = 0; pass < flow.boxes.length; pass++) {
    for (const line of flow.lines) {
      if (isBack(line)) continue;
      const next = (rank.get(line.from) ?? 0) + 1;
      if (next > (rank.get(line.to) ?? 0)) rank.set(line.to, next);
    }
  }
  const columns: string[][] = [];
  for (const box of flow.boxes) (columns[rank.get(box.id) ?? 0] ??= []).push(box.id);
  const deepest = Math.max(...columns.map((column) => column?.length ?? 0));

  const at = new Map<string, LaidBox>();
  const boxes: LaidBox[] = [];
  columns.forEach((ids, r) => {
    ids.forEach((id, k) => {
      const box = flow.boxes.find((each) => each.id === id)!;
      const offset = ((deepest - ids.length) / 2 + k);
      const x = orientation === 'row' ? s.pad + r * (s.w + s.gx) : s.pad + offset * (s.w + s.gx);
      const y = orientation === 'row' ? s.pad + offset * (s.h + s.gy) : s.pad + r * (s.h + s.gy);
      const laid = { id, type: box.type, title: wrapTitle(box.title, s.w), x, y, w: s.w, h: s.h };
      at.set(id, laid);
      boxes.push(laid);
    });
  });
  const across = orientation === 'row' ? columns.length : deepest;
  const down = orientation === 'row' ? deepest : columns.length;
  const bodyW = s.pad * 2 + across * s.w + (across - 1) * s.gx;
  const bodyH = s.pad * 2 + down * s.h + (down - 1) * s.gy;

  const lines: LaidLine[] = [];
  let backs = 0;
  for (const line of flow.lines) {
    const a = at.get(line.from);
    const b = at.get(line.to);
    if (!a || !b) continue;
    const back = isBack(line);
    const key = lineKey(line.from, line.to);
    const r = 10;
    if (orientation === 'row') {
      if (back) {
        const lane = bodyH + 14 + backs * 18;
        backs++;
        const x1 = a.x + a.w / 2 + 10;
        const x2 = b.x + b.w / 2 - 10;
        const y1 = a.y + a.h;
        const y2 = b.y + b.h + 4;
        const d = `M ${x1} ${y1} V ${lane - r} Q ${x1} ${lane} ${x1 - r} ${lane} H ${x2 + r} Q ${x2} ${lane} ${x2} ${lane - r} V ${y2}`;
        lines.push({ key, from: line.from, to: line.to, when: line.when, back, d,
          label: { x: (x1 + x2) / 2, y: lane - 7, text: line.when === 'fail' ? 'fail ⟲ back' : 'back', anchor: 'middle' } });
      } else {
        const x1 = a.x + a.w;
        const y1 = a.y + a.h / 2;
        const x2 = b.x - 4;
        const y2 = b.y + b.h / 2;
        const d = y1 === y2 ? `M ${x1} ${y1} H ${x2}` : `M ${x1} ${y1} C ${x1 + s.gx / 2} ${y1} ${x2 - s.gx / 2} ${y2} ${x2} ${y2}`;
        lines.push({ key, from: line.from, to: line.to, when: line.when, back, d,
          label: line.when ? { x: (x1 + x2) / 2, y: Math.min(y1, y2) - 8, text: line.when, anchor: 'middle' } : undefined });
      }
    } else if (back) {
      const lane = bodyW + 12 + backs * 18;
      backs++;
      const y1 = a.y + a.h / 2 + 8;
      const y2 = b.y + b.h / 2 - 8;
      const x1 = a.x + a.w;
      const x2 = b.x + b.w + 4;
      const d = `M ${x1} ${y1} H ${lane - r} Q ${lane} ${y1} ${lane} ${y1 - r} V ${y2 + r} Q ${lane} ${y2} ${lane - r} ${y2} H ${x2}`;
      lines.push({ key, from: line.from, to: line.to, when: line.when, back, d,
        label: { x: lane + 6, y: (y1 + y2) / 2 + 4, text: line.when === 'fail' ? 'fail ⟲' : 'back', anchor: 'start' } });
    } else {
      const x1 = a.x + a.w / 2;
      const y1 = a.y + a.h;
      const x2 = b.x + b.w / 2;
      const y2 = b.y - 4;
      const d = x1 === x2 ? `M ${x1} ${y1} V ${y2}` : `M ${x1} ${y1} C ${x1} ${y1 + s.gy / 2} ${x2} ${y2 - s.gy / 2} ${x2} ${y2}`;
      lines.push({ key, from: line.from, to: line.to, when: line.when, back, d,
        label: line.when ? { x: Math.max(x1, x2) + 10, y: (y1 + y2) / 2 + 4, text: line.when, anchor: 'start' } : undefined });
    }
  }
  const width = orientation === 'row' ? bodyW : bodyW + (backs ? 12 + backs * 18 + 52 : 0);
  const height = orientation === 'row' ? bodyH + (backs ? 14 + backs * 18 : 0) : bodyH;
  return { boxes, lines, width, height, across: columns.length };
}
