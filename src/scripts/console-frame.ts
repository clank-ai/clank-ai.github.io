/**
 * One frame of `clank console --snapshot` (plain text) as HTML for the page, at build time: its size in cells, and the
 * text escaped with the few marks the console always colors the same way picked out (its borders dim, the ◆ CLANK
 * mark orange, ✓ green, ✗ red). Nothing else is guessed: the frame's words are as the console wrote them.
 */
import { escapeHtml } from './texlite';

export interface ConsoleFrame {
  html: string;
  cols: number;
  rows: number;
}

const BORDER = /[─-╿]+/g; // box drawing

export function consoleFrame(text: string): ConsoleFrame {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n');
  const cols = Math.max(1, ...lines.map((line) => [...line].length));
  const html = lines
    .map((line) =>
      escapeHtml(line)
        .replace(BORDER, (run) => `<span class="ln">${run}</span>`)
        .replace('◆ CLANK', '<span class="or">◆ CLANK</span>')
        .replace(/✓/g, '<span class="g">✓</span>')
        .replace(/✗/g, '<span class="r">✗</span>'),
    )
    .join('\n');
  return { html, cols, rows: lines.length };
}
