/**
 * A grid of monospace cells, as a terminal holds them: the demo draws Clank's console and OpenCode
 * into one of these, then turns it into HTML (one line per row, one span per run of a color).
 *
 * Every character takes one cell. The site's JetBrains Mono (with its box-drawing subset) draws
 * nearly all of them at the cell's width; the few it lacks (○, ⟲, braille spinners) are wrapped in
 * a one-cell box so a fallback font cannot push the rest of the row out of line.
 */

const FOREIGN = /[○⟲✎⊘↩⏎⠀-⣿]/;

export class Grid {
  readonly w: number;
  readonly h: number;
  private readonly ch: string[];
  private readonly k: string[];

  constructor(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.ch = new Array(this.w * this.h).fill(' ');
    this.k = new Array(this.w * this.h).fill('');
  }

  /** Writes text at (x, y) in one color class; returns how many cells it took. */
  put(x: number, y: number, text: string, k = ''): number {
    if (y < 0 || y >= this.h) return 0;
    let i = 0;
    for (const c of text) {
      const xx = x + i;
      if (xx >= this.w) break;
      if (xx >= 0) {
        this.ch[y * this.w + xx] = c;
        this.k[y * this.w + xx] = k;
      }
      i++;
    }
    return i;
  }

  /** Sets the color class of cells without changing their characters (a highlight). */
  paint(x: number, y: number, len: number, k: string) {
    if (y < 0 || y >= this.h) return;
    for (let i = 0; i < len; i++) {
      const xx = x + i;
      if (xx >= 0 && xx < this.w) this.k[y * this.w + xx] = k;
    }
  }

  fill(x: number, y: number, w: number, h: number, c = ' ', k = '') {
    for (let yy = y; yy < y + h; yy++) this.put(x, yy, c.repeat(Math.max(0, w)), k);
  }

  /** A panel: a box with its title in its top border, and an optional title on the right. */
  box(
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { title?: string; right?: string; style?: 'solid' | 'dash' | 'heavy'; k?: string; tk?: string; rk?: string } = {},
  ) {
    if (w < 2 || h < 2) return;
    const style = opts.style ?? 'solid';
    const k = opts.k ?? 'ln';
    const s =
      style === 'heavy'
        ? { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' }
        : style === 'dash'
          ? { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '┄', v: '┆' }
          : { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' };
    this.put(x, y, s.tl + s.h.repeat(w - 2) + s.tr, k);
    for (let yy = y + 1; yy < y + h - 1; yy++) {
      this.put(x, yy, s.v, k);
      this.put(x + w - 1, yy, s.v, k);
    }
    this.put(x, y + h - 1, s.bl + s.h.repeat(w - 2) + s.br, k);
    let left = x + 1;
    if (opts.title) {
      const t = clip(opts.title, w - 6);
      this.put(x + 1, y, s.h + ' ', k);
      this.put(x + 3, y, t, opts.tk ?? 'hb');
      this.put(x + 3 + t.length, y, ' ', k);
      left = x + 4 + t.length;
    }
    if (opts.right) {
      const room = x + w - 2 - left - 3;
      if (room > 4) {
        const r = clip(opts.right, room);
        this.put(x + w - 4 - r.length, y, ' ', k);
        this.put(x + w - 3 - r.length, y, r, opts.rk ?? 'mu');
        this.put(x + w - 3, y, ' ' + s.h, k);
      }
    }
  }

  html(): string {
    const out: string[] = [];
    for (let y = 0; y < this.h; y++) {
      let line = '';
      let run = '';
      let cls = this.k[y * this.w];
      const flush = () => {
        if (!run) return;
        line += cls ? `<span class="${cls}">${run}</span>` : run;
        run = '';
      };
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (this.k[i] !== cls) {
          flush();
          cls = this.k[i];
        }
        run += cell(this.ch[i]);
      }
      flush();
      out.push(line);
    }
    return out.join('\n');
  }
}

function cell(c: string): string {
  if (c === '&') return '&amp;';
  if (c === '<') return '&lt;';
  if (c === '>') return '&gt;';
  if (FOREIGN.test(c)) return `<i class="cw">${c}</i>`;
  return c;
}

/** Cuts text to n cells, ending with an ellipsis when it had to cut. */
export function clip(text: string, n: number): string {
  const chars = Array.from(text);
  if (n <= 0) return '';
  if (chars.length <= n) return text;
  return chars.slice(0, Math.max(0, n - 1)).join('') + '…';
}

/** Wraps text into lines of at most n cells, at spaces where it can. */
export function wrap(text: string, n: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    if (!para) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(' ')) {
      const candidate = line ? line + ' ' + word : word;
      if (Array.from(candidate).length <= n) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      let rest = word;
      while (Array.from(rest).length > n) {
        lines.push(Array.from(rest).slice(0, n).join(''));
        rest = Array.from(rest).slice(n).join('');
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

export function pad(text: string, n: number): string {
  const len = Array.from(text).length;
  return len >= n ? clip(text, n) : text + ' '.repeat(n - len);
}
