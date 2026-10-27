/**
 * The site's constants, in one place. Change them here and nowhere else.
 *
 * DOMAIN is where the site is served: GitHub Pages for now; set the custom domain here (without "https://")
 * once it is bought and added to the Pages settings.
 *
 * GITHUB_URL is Clank's public repository, once the repository is public.
 */
export const DOMAIN = 'clank-ai.github.io';

export const GITHUB_URL = 'https://github.com/clank-ai/clank';

/** True: Clank's repository is public (the first public beta), so the site links into it. */
export const RELEASED = true;

/** False until the one-line installer is written: the install boxes say it is coming and point to Get started. */
export const INSTALLER_READY = true;

/**
 * The release the installer installs, and whether the main branch holds work it does not have yet. While it does, the
 * features page says which parts come with the next release: set PENDING to false when the next release is tagged.
 */
export const RELEASE = { latest: '0.3.0b1', pending: true } as const;

/** The license Clank is released under (SPDX: AGPL-3.0-only). Every page names it from here, and only here. */
export const LICENSE = 'AGPL-3.0';

/** True once DOMAIN holds a real domain: only then are canonical and social URLs written. */
export const DOMAIN_IS_SET = !DOMAIN.startsWith('[');

export const SITE_URL = `https://${DOMAIN}`;

export const INSTALL = {
  unix: `curl -fsSL https://${DOMAIN}/install.sh | sh`,
  windows: `irm https://${DOMAIN}/install.ps1 | iex`,
} as const;

export const LINKS = {
  github: GITHUB_URL,
  docs: `${GITHUB_URL}/tree/main/docs`,
  walkthrough: `${GITHUB_URL}/blob/main/docs/walkthrough.md`,
  console: `${GITHUB_URL}/blob/main/docs/console.md`,
  models: `${GITHUB_URL}/tree/main/docs/models`,
  design: `${GITHUB_URL}/tree/main/docs/design`,
  decisions: `${GITHUB_URL}/tree/main/docs/decisions`,
  license: `${GITHUB_URL}/blob/main/LICENSE`,
  agents: `${GITHUB_URL}/blob/main/AGENTS.md`,
  contributing: `${GITHUB_URL}/blob/main/CONTRIBUTING.md`,
  roadmap: `${GITHUB_URL}/blob/main/docs/ROADMAP.md`,
  security: `${GITHUB_URL}/blob/main/SECURITY.md`,
  issues: `${GITHUB_URL}/issues`,
  fork: `${GITHUB_URL}/fork`,
  principles: `${GITHUB_URL}/blob/main/docs/PRINCIPLES.md`,
  opencode: 'https://opencode.ai',
} as const;

/** A path in Clank's repository as a link: a folder (ending in "/") opens as a tree, a file as a file. */
export function repo(path: string): string {
  return `${GITHUB_URL}/${path.endsWith('/') ? 'tree' : 'blob'}/main/${path.replace(/\/$/, '')}`;
}

/**
 * The site's pages. Paths are written from the root ("/features"); the build makes them relative,
 * and the preview build points them at the .html files.
 */
export const PAGES = {
  home: { path: '/', label: 'Home' },
  why: { path: '/why', label: 'Why Clank' },
  features: { path: '/features', label: 'Features' },
  start: { path: '/get-started', label: 'Get started' },
  openSource: { path: '/open-source', label: 'Open source' },
  faq: { path: '/faq', label: 'FAQ' },
  blog: { path: '/blog', label: 'Blog' },
  changelog: { path: '/changelog', label: 'Changelog' },
  setup: { path: '/what-runs', label: 'What runs on your PC' },
  brand: { path: '/brand', label: 'Brand' },
} as const;

/** The top navigation, in order. Docs points at the repository until the docs are hosted here. */
export const NAV: { label: string; href: string; external?: boolean }[] = [
  { label: PAGES.why.label, href: PAGES.why.path },
  { label: PAGES.features.label, href: PAGES.features.path },
  { label: PAGES.start.label, href: PAGES.start.path },
  ...(RELEASED ? [{ label: 'Docs', href: LINKS.docs, external: true }] : []),
  { label: PAGES.openSource.label, href: PAGES.openSource.path },
  { label: PAGES.faq.label, href: PAGES.faq.path },
  { label: PAGES.blog.label, href: PAGES.blog.path },
];

export const SITE = {
  name: 'Clank',
  title: 'Clank: precise control over your AI coding agents',
  description:
    'Clank runs, monitors and steers AI coding agents on models you control: your own GPU and/or a cloud API key, with far less reliance on hosted tools like Codex and Claude Code.',
} as const;
