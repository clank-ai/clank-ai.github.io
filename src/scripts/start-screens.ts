/**
 * The console's screens for Get started, drawn at build time from the frames Clank's own tests keep
 * (tests/console/snapshots in Clank's repository: add-model-*.txt, providers-cloud.txt,
 * runtime-models-stopped.txt), with the same words and line breaks, and example names in place of
 * anyone's own: the folder my-api, the model "Example Coder", the presets "your-model".
 *
 * Each screen keeps three blank columns on its left for the numbered marks the page sets beside the
 * lines a step talks about (src/components/start/Screen.astro), so a mark never covers a word.
 */
import { Grid } from './demo/cells';

export interface Screen {
  html: string;
  cols: number;
}

type Part = [string, string?];
const GUTTER = 3;
const W = 66;

function row(g: Grid, x: number, y: number, parts: Part[]) {
  let xx = GUTTER + x;
  for (const [t, k] of parts) xx += g.put(xx, y, t, k ?? '');
}

/** The console's first line: the logo, the folder, the pills. */
function header(g: Grid, y: number, model: Part) {
  row(g, 1, y, [['◆ CLANK', 'or'], ['  my-api   ', 'mu'], ['● service', 'g'], ['  '], ['● docker', 'g'], ['  '], model, ['  '], ['● gateway', 'g']]);
}

/** A panel: its title in the top border, then lines of parts, one per row. */
function panel(g: Grid, y: number, title: string, lines: Part[][], w = W, x = 0) {
  g.box(GUTTER + x, y, w, lines.length + 2, { title });
  lines.forEach((parts, i) => row(g, x + 2, y + 1 + i, parts));
  return y + lines.length + 2;
}

/** The keys bar at the bottom. */
function keys(g: Grid, y: number, list: [string, string][]) {
  const parts: Part[] = [];
  for (const [k, label] of list) parts.push([k, 'key'], [` ${label}  `, 'mu']);
  row(g, 1, y, parts);
}

/** An input field as Textual draws it: a bar on the left, a top and a bottom edge. */
function field(g: Grid, y: number, value: Part, x = 2, w = 62): number {
  row(g, x, y, [['▊', 'ln'], ['▔'.repeat(w - 2), 'ln'], ['▎', 'ln']]);
  row(g, x, y + 1, [['▊', 'ln'], [' '], value]);
  row(g, x + w - 1, y + 1, [['▎', 'ln']]);
  row(g, x, y + 2, [['▊', 'ln'], ['▁'.repeat(w - 2), 'ln'], ['▎', 'ln']]);
  return y + 3;
}

function done(g: Grid): Screen {
  return { html: g.html(), cols: g.w };
}

const NO_MODEL: Part = ['● no model', 'y'];
const CODER: Part = ['● cloud: Example Coder', 'g'];

/** Add a model, its first screen: cloud or local. */
export function choice(): Screen {
  const g = new Grid(GUTTER + W, 18);
  header(g, 0, NO_MODEL);
  const end = panel(g, 1, 'Add a model', [
    [['No model is usable yet: no model runs in the main slot, and no']],
    [['preset for it can load here: add one (Add a model).']],
    [],
    [['How should Clank run its model?', 'wb']],
    [],
    [['c', 'key'], ['  Cloud: a model at OpenRouter, with your key. No GPU needed.']],
    [['Each request costs money, from your OpenRouter credits, and', 'mu']],
    [['Clank shows what each one cost.', 'mu']],
    [],
    [['l', 'key'], ["  Local: a model on this computer's GPU. Nothing to pay per"]],
    [['request; it needs an engine and the model\'s files (many GB)', 'mu']],
    [['here. This computer: NVIDIA GeForce RTX 4080, 16.0 GB; 32.0 GB', 'mu']],
    [['of memory.', 'mu']],
  ]);
  keys(g, end + 1, [['c', 'cloud'], ['l', 'local'], ['esc', 'this folder'], ['?', 'explain']]);
  return done(g);
}

/** Cloud: the provider, OpenRouter. */
export function provider(): Screen {
  const g = new Grid(GUTTER + W, 15);
  header(g, 0, NO_MODEL);
  const end = panel(g, 1, 'Cloud: the provider', [
    [['OpenRouter: one account and one key reach the major models']],
    [["(OpenAI's, Anthropic's, Google's, open-weight ones), each at"]],
    [['its own price. It is the one cloud provider for now; others']],
    [['come later.']],
    [],
    [['You need an OpenRouter account with credits, and a key:']],
    [['openrouter.ai, Keys, Create Key. OpenRouter recommends a', 'wb']],
    [['credit limit on every key; set one there.']],
    [],
    [['Next: what goes to OpenRouter, then your key.', 'mu']],
  ]);
  keys(g, end + 1, [['enter', 'go on'], ['esc', 'back'], ['?', 'explain']]);
  return done(g);
}

/** What goes to OpenRouter: read once, agree with y. */
export function agreement(): Screen {
  const g = new Grid(GUTTER + W, 30);
  header(g, 0, NO_MODEL);
  const end = panel(g, 1, 'What goes to OpenRouter', [
    [['Read this once, for OpenRouter.']],
    [],
    [['What goes: ', 'wb'], ["each request of an agent's session: your messages,"]],
    [["what the agent reads of the folder, command output, and its"]],
    [['instructions.']],
    [],
    [['Where: ', 'wb'], ["to OpenRouter, then the model's provider. OpenRouter"]],
    [['does not log prompts by default.']],
    [],
    [['What never goes: ', 'wb'], ['Notion pages; the MCP servers marked local']],
    [['(below); a workspace you have not allowed. Each workspace asks']],
    [['once, the first time its agent would use the cloud model;']],
    [['those you have now stay local until you say.']],
    [],
    [['What it costs: ', 'wb'], ['each request is paid from your OpenRouter']],
    [['credits. Clank shows what each request, session and flow cost,']],
    [['and you may set a daily and a monthly limit.']],
    [],
    [['Clank asks only for providers that do not keep your data']],
    [['(data_collection deny). o allows any provider.']],
    [],
    [['MCP servers (each one you have is marked local only; unmark', 'mu']],
    [['one to offer it):', 'mu']],
    [['my-tools', 'wb'], ['  local only: never offered to the cloud model', 'mu']],
    [['web     ', 'wb'], ['  local only: never offered to the cloud model', 'mu']],
  ]);
  keys(g, end + 1, [['y', 'agree'], ['n', 'back'], ['space', 'mark'], ['o', 'policy'], ['?', 'explain']]);
  return done(g);
}

/** Your OpenRouter key, in a field that never shows it. */
export function key(): Screen {
  const g = new Grid(GUTTER + W, 14);
  header(g, 0, NO_MODEL);
  g.box(GUTTER, 1, W, 11, { title: 'Your OpenRouter key' });
  row(g, 2, 2, [['Paste your OpenRouter key (openrouter.ai, Keys). It is never']]);
  row(g, 2, 3, [['shown: dots, then its last four.']]);
  field(g, 4, ['•••••••••••••••••••…-key', 'wb']);
  row(g, 2, 8, [['Enter: Clank asks OpenRouter whether it takes the key (which', 'mu']]);
  row(g, 2, 9, [['costs nothing) and keeps it only then, in CLANK_HOME/secrets,', 'mu']]);
  row(g, 2, 10, [['readable by you alone. It is never shown, logged or copied.', 'mu']]);
  keys(g, 13, [['enter', 'check it'], ['esc', 'back'], ['?', 'explain']]);
  return done(g);
}

/** The model: OpenRouter's live list, those that take tool calls. */
export function models(): Screen {
  const g = new Grid(GUTTER + W, 19);
  header(g, 0, NO_MODEL);
  const end = panel(g, 1, 'The model', [
    [['key "made-up key label" (ends …-key): its own limit $20.00,', 'mu']],
    [['$18.71 left; OpenRouter counts $0.12 today, $1.29 this month', 'mu']],
    [['(UTC days)', 'mu']],
    [],
    [['2 that take tool calls, programming models, most used first.']],
    [['Prices per million tokens.']],
    [['Example Coder                                                 ', 'sel']],
    [['  262K window · $0.30 in, $1.20 out · thinks', 'mu']],
    [['Example Small (free)', 'wb']],
    [['  33K window · free (20 a minute, 50 a day; 1,000 a day once', 'mu']],
    [['10 credits were bought) · reads images', 'mu']],
    [],
    [['example-vendor/example-coder: A made-up model for coding.']],
    [['Window 262,144 tokens, most output 32,768.']],
  ]);
  keys(g, end + 1, [['/', 'search'], ['s', 'sort'], ['f', 'free'], ['esc', 'back'], ['enter', 'pick']]);
  return done(g);
}

/** Its settings, filled in for you, with the cost of the test. */
export function settings(): Screen {
  const g = new Grid(GUTTER + W, 36);
  header(g, 0, NO_MODEL);
  g.box(GUTTER, 1, W, 33, { title: 'Its settings' });
  row(g, 2, 2, [['Example Coder (example-vendor/example-coder)', 'wb']]);
  let y = 3;
  const labelled = (label: string, more: string | null, value: Part) => {
    row(g, 2, y++, [[label, 'mu']]);
    if (more) row(g, 2, y++, [[more, 'mu']]);
    y = field(g, y, value);
  };
  labelled('Its title, as the pickers show it', null, ['cloud: Example Coder', 'wb']);
  labelled("Its context, in tokens (the model's window, 262,144; a smaller", 'one makes OpenCode compact sooner and each request cost less)', ['262144', 'wb']);
  labelled('Its most output, in tokens (at most 32,768)', null, ['16384', 'wb']);
  labelled('Its thinking effort (one of default, low, medium, high)', null, ['default', 'wb']);
  labelled("A day's cost limit, US dollars (empty: none)", null, ['']);
  labelled("A month's cost limit, US dollars (empty: none)", null, ['']);
  row(g, 2, y++, [['OpenRouter can limit the key too (openrouter.ai, Keys). Taking']]);
  row(g, 2, y++, [['these writes the preset, then tests it with one short request.']]);
  row(g, 2, y++, [['One short request: about $0.000031 at its prices. Enter takes', 'wb']]);
  row(g, 2, y++, [['these.', 'wb']]);
  keys(g, 35, [['enter', 'take'], ['tab', 'next'], ['esc', 'back'], ['?', 'explain']]);
  return done(g);
}

/** Ready: the test passed; the model runs in the main slot. */
export function ready(): Screen {
  const g = new Grid(GUTTER + W, 15);
  header(g, 0, CODER);
  const end = panel(g, 1, 'Ready', [
    [['cloud: Example Coder runs in the main slot. Its test: it', 'wb']],
    [['answered a tiny request: OK in 0.0 s, $0.000021.']],
    [],
    [["Docker runs: a workspace's container can start."]],
    [],
    [["This folder's agent works with it; it asks once whether this"]],
    [['workspace may use the cloud model.']],
    [],
    [['Each request costs money: Home, Requests and the Monitor show', 'mu']],
    [['what each cost; the Providers and models page sets the limits.', 'mu']],
  ]);
  keys(g, end + 1, [['enter', 'this folder'], ['?', 'explain']]);
  return done(g);
}

/** Providers and models (0): the cloud account, what it cost, the limits. */
export function cloudCost(): Screen {
  const g = new Grid(GUTTER + W, 15);
  const end = panel(g, 0, 'Cloud', [
    [['OpenRouter (openrouter) · agreed 2026-10-11 11:40', 'wb']],
    [['  key       ', 'mu'], ['set 2026-10-11 11:40, ends …-key']],
    [['  policy    ', 'mu'], ['providers that do not keep your data']],
    [['  account   ', 'mu'], ['key "made-up key label": its own limit $20.00,']],
    [['            $18.71 left; OpenRouter counts $0.12 today', 'mu']],
    [['  Clank     ', 'mu'], ['cloud $0.42 today · $0.42 this month', 'y']],
    [["            (this computer's days); today's limit $5.00;", 'mu']],
    [['            no monthly limit', 'mu']],
    [['  check     ', 'mu'], ['not checked yet: c checks it']],
    [['  presets   ', 'mu'], ['cloud: Example Coder']],
  ]);
  keys(g, end + 1, [['a', 'add a cloud model'], ['k', 'set the key'], ['c', 'check it'], ['L', 'cost limits']]);
  return done(g);
}

/** Add a model, l: the local presets, each with its fit on this GPU and what it needs. */
export function local(): Screen {
  const g = new Grid(GUTTER + W, 21);
  header(g, 0, NO_MODEL);
  const end = panel(g, 1, 'Local: a model on this computer', [
    [["Clank's presets for the main slot, each with its fit on this"]],
    [['GPU and what it needs here. Each missing step is done in']],
    [["order: the engine by Clank's recipe, the model's files, the"]],
    [['load; each is asked first. A local model costs nothing per']],
    [['request.']],
    [['your-model 262K                                               ', 'sel']],
    [['  kvmem-llamacpp · your-model · fit: known once its engine is', 'mu']],
    [['installed', 'mu']],
    [["  install KVMem/llama.cpp; download your-model's weights", 'y']],
    [['(11.3 GB)', 'y']],
    [['your-model 96K', 'wb']],
    [['  kvmem-llamacpp · your-model · fit: known once its engine is', 'mu']],
    [['installed', 'mu']],
    [["  install KVMem/llama.cpp; download your-model's weights", 'y']],
    [['(11.3 GB)', 'y']],
  ]);
  keys(g, end + 1, [['enter', 'set it up'], ['esc', 'back'], ['?', 'explain']]);
  return done(g);
}

/** Providers and models (0): the serving setups, and whether each is installed. */
export function engines(): Screen {
  const g = new Grid(GUTTER + W, 6);
  panel(g, 0, 'Serving setups', [
    [['KVMem/llama.cpp (kvmem-llamacpp), reads gguf', 'wb']],
    [['  not installed', 'y']],
    [['llama.cpp (llamacpp), reads gguf', 'wb']],
    [['  b11588  ', 'mu'], ['not installed · Clank has its recipe', 'y']],
  ]);
  return done(g);
}

/** Providers and models (0): a model's files, each from a pinned revision. */
export function modelFiles(): Screen {
  const g = new Grid(GUTTER + W, 7);
  panel(g, 0, 'Models', [
    [['your-model (your-model)', 'wb']],
    [['  gguf weights     ', 'mu'], ['your-model-Q4_K_M.gguf, 11.3 GB, from']],
    [['example/your-model-GGUF@5788aee90e72', 'mu']],
    [['    no host has an engine that reads it', 'y']],
    [['  gguf projector   ', 'mu'], ['mmproj-Q8_0.gguf, 629 MB', 'mu']],
  ]);
  return done(g);
}

/** Models (8): the main slot, and the GPU's memory before anything loads. */
export function slots(): Screen {
  const g = new Grid(GUTTER + W, 10);
  let y = panel(g, 0, 'Slots', [[['main  ', 'wb'], ['STOPPED since 12:00: never started', 'mu']]]);
  y = panel(g, y + 1, 'Memory', [
    [['It runs nothing.']],
    [['the GPU: ', 'mu'], ['2,041 of 16,303 MiB in use, 14,262 free', 'wb']],
  ]);
  keys(g, y + 1, [['l', 'load'], ['w', 'switch'], ['u', 'unload'], ['c', 'check'], ['?', 'explain']]);
  return done(g);
}
