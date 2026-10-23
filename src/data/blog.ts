/**
 * The blog: its posts, newest first, and the posts planned next. A post's page lives in
 * src/pages/posts/<slug>.astro; this list is what the blog's index shows of it.
 */

export interface Post {
  slug: string;
  title: string;
  /** One sentence under the title, on the index and the post. */
  dek: string;
  tag: string;
  /** ISO date it was published, and as the page says it. */
  date: string;
  dateText: string;
  minutes: number;
  author: string;
  stats: { value: string; label: string }[];
}

export const POSTS: Post[] = [
  {
    slug: '27b-262k-on-a-16gb-gpu',
    title: 'Running a 27B model with 262K context on a 16 GB GPU',
    dek: 'Swift 1.5, KVMem and Clank on one RTX 5080: how the pieces fit, what they cost, how fast they run, how to set it up, and a claim-by-claim check of the video that started it.',
    tag: 'Setup',
    date: '2026-10-23',
    dateText: 'October 23, 2026',
    minutes: 18,
    author: 'sjbevins',
    stats: [
      { value: '262,144', label: 'tokens of context' },
      { value: '14,453 MiB', label: 'on a 16 GB card' },
      { value: '74–79', label: 'tokens/s, short context' },
      { value: '~99%', label: 'of each prompt cached' },
    ],
  },
];

export const PLANNED: { tag: string; title: string; text: string }[] = [
  { tag: 'Benchmark', title: 'Benchmark results: tier A', text: 'Results on problems with known answers, several seeds each.' },
  {
    tag: 'Models',
    title: 'Picking a second model for side tasks',
    text: 'Candidates compared on speed and on checked tasks, with the main GPU already full.',
  },
  {
    tag: 'Flows',
    title: 'The first four flow runs',
    text: 'What the local model did on an open problem, what failed, and what I changed in Clank.',
  },
];

export const postPath = (post: Post) => `/posts/${post.slug}`;
