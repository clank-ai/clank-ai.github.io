/**
 * Short text with a little LaTeX in it, made readable as HTML without a math library: a benchmark's problem ("$17_b$
 * divides $97_b$") or a line a model wrote ("so $b + 7$ divides 56", "$\boxed{70}$"). The text is escaped first; inside
 * $…$, $$…$$, \(…\) and \[…\]: subscripts and superscripts, fractions as a/b, roots, \boxed, \text, and the common
 * symbols and Greek letters. Any other command keeps its name, without the backslash. Used at build time only.
 */

const SYMBOLS: Record<string, string> = {
  cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠',
  approx: '≈', equiv: '≡', cong: '≅', sim: '∼', propto: '∝', infty: '∞', to: '→', rightarrow: '→', leftarrow: '←',
  Rightarrow: '⇒', implies: '⇒', iff: '⇔', mapsto: '↦', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', cup: '∪',
  cap: '∩', emptyset: '∅', varnothing: '∅', forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨', sum: 'Σ',
  prod: 'Π', int: '∫', partial: '∂', nabla: '∇', angle: '∠', triangle: '△', circ: '∘', degree: '°', perp: '⊥',
  parallel: '∥', mid: '|', nmid: '∤', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', langle: '⟨', rangle: '⟩',
  ldots: '…', dots: '…', cdots: '⋯', vdots: '⋮', quad: ' ', qquad: '  ', mod: ' mod ', bmod: ' mod ', pmod: ' mod ',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ',
  vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ',
  tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ',
  Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', ell: 'ℓ',
  ',': ' ', ';': ' ', ':': ' ', '!': '', ' ': ' ', '{': '{', '}': '}', '%': '%', $: '$', '#': '#', '&': '&amp;',
  '\\': ' ', sin: 'sin', cos: 'cos', tan: 'tan', log: 'log', ln: 'ln', exp: 'exp', gcd: 'gcd', lcm: 'lcm',
  max: 'max', min: 'min', det: 'det', lim: 'lim',
};
const SILENT = new Set(['left', 'right', 'big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr', 'Bigl', 'Bigr', 'displaystyle',
  'textstyle', 'limits', 'nolimits']);
const KEEP = new Set(['text', 'textrm', 'textit', 'textbf', 'mathrm', 'mathit', 'mathbf', 'mathsf', 'mathtt',
  'operatorname', 'mbox', 'hbox', 'mathbb', 'mathcal', 'mathfrak', 'overline', 'underline', 'hat', 'bar', 'vec', 'tilde']);

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Parentheses around what is more than one character (a number aside), as a/b and a root need them. */
function wrap(html: string): string {
  const plain = html.replace(/<[^>]+>/g, '');
  return /^\d+(\.\d+)?$/.test(plain) || plain.length <= 1 ? html : `(${html})`;
}

/** Operators and relations, written with a space on each side. */
const SPACED = new Set(['cdot', 'times', 'div', 'pm', 'mp', 'le', 'leq', 'ge', 'geq', 'ne', 'neq', 'approx', 'equiv',
  'cong', 'sim', 'propto', 'to', 'rightarrow', 'leftarrow', 'Rightarrow', 'implies', 'iff', 'mapsto', 'in', 'notin',
  'subset', 'subseteq', 'cup', 'cap', 'land', 'lor', 'mid', 'nmid', 'mod', 'bmod']);

function math(source: string): string {
  let i = 0;
  const atEnd = () => i >= source.length;

  function argument(): string {
    while (source[i] === ' ') i++;
    if (source[i] === '{') {
      i++;
      const inside = sequence('}');
      i++;
      return inside;
    }
    return atom();
  }

  function sequence(end?: string): string {
    let out = '';
    while (!atEnd() && source[i] !== end) out += item();
    return out;
  }

  function item(): string {
    const c = source[i];
    if (c === '^' || c === '_') {
      i++;
      const inside = argument();
      return c === '^' ? `<sup>${inside}</sup>` : `<sub>${inside}</sub>`;
    }
    if (c === '{') {
      i++;
      const inside = sequence('}');
      i++;
      return inside;
    }
    return atom();
  }

  function atom(): string {
    const c = source[i];
    if (c === undefined) return '';
    if (c === '\\') return command();
    i++;
    if (c === '}') return '';
    if (c === '~') return ' ';
    return escapeHtml(c);
  }

  function command(): string {
    i++;
    let name = '';
    if (/[a-zA-Z]/.test(source[i] ?? '')) {
      while (/[a-zA-Z]/.test(source[i] ?? '')) name += source[i++];
      while (source[i] === ' ') i++; // a space after a command's name is not written, as in LaTeX
    } else {
      name = source[i++] ?? '';
    }
    if (name === 'frac' || name === 'tfrac' || name === 'dfrac' || name === 'cfrac') {
      const top = argument();
      const bottom = argument();
      return `${wrap(top)}/${wrap(bottom)}`;
    }
    if (name === 'sqrt') {
      let index = '';
      if (source[i] === '[') {
        const close = source.indexOf(']', i);
        index = escapeHtml(source.slice(i + 1, close));
        i = close + 1;
      }
      return `${index ? `<sup>${index}</sup>` : ''}√${wrap(argument())}`;
    }
    if (name === 'boxed' || name === 'fbox') return `<span class="tex-boxed">${argument()}</span>`;
    if (name === 'binom' || name === 'dbinom' || name === 'tbinom') {
      const n = argument();
      const k = argument();
      return `C(${n}, ${k})`;
    }
    if (name === 'pmod') return ` (mod ${argument()})`;
    if (KEEP.has(name)) return argument();
    if (SPACED.has(name)) return ` ${(SYMBOLS[name] ?? name).trim()} `;
    if (SILENT.has(name)) return '';
    return SYMBOLS[name] ?? escapeHtml(name);
  }

  return sequence()
    .replace(/<sup>∘<\/sup>/g, '°')
    .replace(/ {2,}/g, ' ')
    .replace(/([(\[{⌊⌈]) /g, '$1')
    .replace(/ ([)\]}⌋⌉])/g, '$1')
    .trim();
}

const MATH = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;

/** The text as HTML, its math made readable (see above). */
export function texToHtml(text: string): string {
  let out = '';
  let last = 0;
  for (const found of text.matchAll(MATH)) {
    out += escapeHtml(text.slice(last, found.index));
    const inside = found[1] ?? found[2] ?? found[3] ?? found[4] ?? '';
    out += `<span class="tex">${math(inside.trim())}</span>`;
    last = (found.index ?? 0) + found[0].length;
  }
  return out + escapeHtml(text.slice(last));
}

/** The same text as plain words, for a label or a screen reader's summary. */
export function texToText(text: string): string {
  return texToHtml(text)
    .replace(/<sup>/g, '^')
    .replace(/<sub>/g, '_')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}
