/**
 * The recordings the pages play, each real or a sample. scripts/sync-captures.py copies the real ones from
 * clank-bench's captures (src/data/captures/, src/assets/captures/); until one is there, its sample of the same shape
 * (src/data/sample/, src/assets/sample/) stands in, and every part that shows it says "Sample" (SampleTag), naming the
 * file that replaces it. Nothing here reaches the browser but what a page draws from it.
 */
import type { ImageMetadata } from 'astro';

export type BoxType = 'you' | 'task' | 'verify' | 'integrate';
export type Verdict = 'pass' | 'fail' | null;

export interface FlowTrace {
  problem: { bench: string; id: string; text: string; answer: string };
  flow: {
    title: string;
    boxes: { id: string; type: BoxType | string; title: string }[];
    lines: { from: string; to: string; when: Verdict }[];
  };
  events: { t: number; box: string; try: number; kind: 'start' | 'end' | 'verdict' | 'tool' | 'text'; text: string; verdict: Verdict }[];
  result: { answer: string; correct: boolean; minutes: number; tokens: number; sessions: number };
}

export interface Comparison {
  bench: string;
  model: string;
  /** How the computer was while it ran, said after the model ("while the CPU was fully loaded by other work"). */
  conditions?: string;
  rows: {
    id: string;
    opencode: { correct: boolean; minutes: number; tokens: number };
    flow: { correct: boolean; minutes: number; tokens: number; tries: number };
  }[];
  summary: {
    opencode: { right: number; n: number; minutes: number };
    flow: { right: number; n: number; minutes: number };
  };
}

export interface Frame {
  file: string;
  /** Seconds from the recording's start. */
  t: number;
  caption: string;
}
export interface TextFrame extends Frame {
  text: string;
}
export interface ImageFrame extends Frame {
  image: ImageMetadata;
}

/** A recording, and where it came from: `sample` is true while the real capture is missing. */
export interface Capture<T> {
  data: T;
  sample: boolean;
  /** The capture that replaces the sample, as clank-bench names it. */
  source: string;
}

const json = import.meta.glob<unknown>(['./captures/**/*.json', './sample/**/*.json'], { eager: true, import: 'default' });
// Every file of the console folders, as text: a frame may have any name frames.json gives it.
const texts = import.meta.glob<string>(['./captures/console/*', './sample/console/*'], {
  eager: true,
  query: '?raw',
  import: 'default',
});
const images = import.meta.glob<ImageMetadata>(
  ['../assets/captures/*/*.{png,jpg,jpeg,webp}', '../assets/sample/*/*.{png,jpg,jpeg,webp}'],
  { eager: true, import: 'default' },
);

function pick<T>(name: string, source: string): Capture<T> {
  const real = json[`./captures/${name}`];
  if (real !== undefined) return { data: real as T, sample: false, source };
  const sample = json[`./sample/${name}`];
  if (sample === undefined) throw new Error(`no capture and no sample for ${name}`);
  return { data: sample as T, sample: true, source };
}

/** Frames listed in a folder's frames.json, each with its text (`text`) or its image (`image`); real ones first. */
function frames<F>(folder: string, attach: (where: string, frame: Frame) => F | undefined): Capture<F[]> {
  const source = `captures/${folder}/frames.json`;
  for (const [where, sample] of [['captures', false], ['sample', true]] as const) {
    const listed = json[`./${where}/${folder}/frames.json`] as Frame[] | undefined;
    if (!listed) continue;
    const found = listed.map((frame) => attach(where, frame));
    if (found.every((frame) => frame !== undefined)) return { data: found as F[], sample, source };
  }
  throw new Error(`no frames for ${folder}`);
}

/** Whether a capture may show on a page: a real one always, a sample only in development (samples never ship). */
export function shipped(capture: Capture<unknown>): boolean {
  return import.meta.env.DEV || !capture.sample;
}

export const flowTrace = pick<FlowTrace>('flow-trace.json', 'captures/flow-trace.json');
export const comparison = pick<Comparison>('flows-vs-opencode.json', 'captures/flows-vs-opencode.json');

export const consoleFrames = frames<TextFrame>('console', (where, frame) => {
  const text = texts[`./${where}/console/${frame.file}`];
  return text === undefined ? undefined : { ...frame, text };
});

function imageFrames(folder: string): Capture<ImageFrame[]> {
  return frames<ImageFrame>(folder, (where, frame) => {
    const image = images[`../assets/${where}/${folder}/${frame.file}`];
    return image === undefined ? undefined : { ...frame, image };
  });
}

export const phoneFrames = imageFrames('phone');
export const vscodeFrames = imageFrames('vscode');
