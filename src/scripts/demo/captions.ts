/**
 * What the demo shows, step by step: the caption under it, and the walkthrough for anyone who
 * reads rather than watches. Kept apart from the player so the page can list them when it is built.
 */
export const CAPTIONS: string[] = [
  "In a folder, f in Clank opens a planning session in OpenCode, beside the console.",
  "You say what you want, in your own words.",
  "The model reads the folder. Clank counts each tool call.",
  "It asks what it needs to know, a few questions at a time.",
  "You answer. The model writes the brief with you: the goal, the limits, what done means.",
  "It sends the flow. Clank checks the draft and says exactly what to fix.",
  "The second draft is accepted and drawn. You look it over, then press r.",
  "It runs on its own. Each box is a fresh session that starts with only what it needs.",
  "VERIFY checks the plan in a fresh session, against the brief, and sends it back with numbered findings.",
  "PLAN tries again with the findings; the second check passes.",
  "DECOMPOSE proposes the tasks; they run one after another, each seeing what came before.",
  "It stops only at the end: you review the whole, with the brief checked against what was made.",
];

/** The chapters: a name, and the step each one starts at. */
export const CHAPTERS: { name: string; step: number }[] = [
  { name: 'Describe', step: 0 },
  { name: 'Answer', step: 2 },
  { name: 'Draft', step: 5 },
  { name: 'Run', step: 7 },
  { name: 'Verify', step: 8 },
  { name: 'Review', step: 10 },
];
