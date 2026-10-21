/**
 * What the demo shows, step by step: the caption under it, and the walkthrough for anyone who
 * reads rather than watches. Kept apart from the player so the page can list them when it is built.
 */
export const CAPTIONS: string[] = [
  'In your folder, f opens a planning session in OpenCode, beside Clank.',
  'You say what you want, in your own words.',
  'The model reads the folder; Clank counts each tool call.',
  'It asks what it needs to know, a few questions at a time.',
  'You answer, and the brief is written together: the goal, the limits, done.',
  'It sends the flow. Clank checks the draft and says what to fix.',
  'The second draft is accepted and drawn. You look, then press r.',
  'It runs on its own: each box is a fresh session with only what it needs.',
  'VERIFY checks the plan against the brief and sends it back with findings.',
  'PLAN tries again with the findings; the second check passes.',
  'DECOMPOSE proposes the tasks; they run one after another.',
  'It stops only at the end: you review the whole against the brief.',
];

/** The steps the walkthrough is told in: a name, what happens in a few words, and the moment it starts at. */
export const CHAPTERS: { name: string; what: string; step: number }[] = [
  { name: 'Describe', what: 'You say what you want', step: 0 },
  { name: 'Answer', what: 'The model asks; you answer', step: 2 },
  { name: 'Draft', what: 'Clank checks each draft', step: 5 },
  { name: 'Run', what: 'Each box, a fresh session', step: 7 },
  { name: 'Verify', what: 'Checked against the brief', step: 8 },
  { name: 'Review', what: 'The tasks run; you decide', step: 10 },
];
