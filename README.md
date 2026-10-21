# Clank's website

The public website of Clank, <https://clank-ai.github.io>: a static site built with [Astro](https://astro.build)
and plain CSS, published by GitHub Pages. It loads nothing from other hosts: no trackers, no analytics, no
cookies, fonts served from the site itself.

## Develop

Needs Node 22 or newer.

```
npm install          # once
npm run dev          # http://localhost:4321, reloads as you edit
npm run build        # the site, in dist/
npm run preview      # serves dist/ to check the build
npm run check        # checks dist/: no request to another host, no missing file or anchor
```

## Where things are

| Path | What |
| --- | --- |
| `src/config.ts` | **The constants**: the domain, the repository and its links, the license, the install commands, `INSTALLER_READY`, the pages and the navigation. Change them here only. |
| `src/pages/` | One file per page: Home (`index.astro`), Why Clank, Features, Get started, Open source, FAQ, the brand page (kept out of search) and 404 |
| `src/components/` | The shared parts (`Nav`, `SubNav`, `Footer`, `InstallCommand`, `CommandBlock`, `Window`, `Crop`, `Icon`, `Logo`), and by page: `home/`, `demo/` (Home's demo), `start/` (Get started's system switch and screens), `oss/` (the Open source page), `surfaces/` (VS Code and the phone, drawn in HTML) |
| `src/scripts/demo/` | Home's demo: the cell grid (`cells.ts`), the two screens (`views.ts`), the captions and steps (`captions.ts`), and what plays it and fits it to the window (`demo.ts`) |
| `src/scripts/crops.ts`, `src/scripts/start-screens.ts` | Still frames of the console, drawn at build time from the frames Clank's own tests keep, with example names |
| `src/scripts/system.ts` | The reader's system (Windows, macOS, Linux), one choice for every block marked `data-for` |
| `src/styles/global.css` | The design tokens (colors from Clank's console, type, spacing) and the few shared rules |
| `public/install.ps1`, `public/install.sh` | The one-line installer, served at `/install.ps1` and `/install.sh`; `INSTALLER_READY` shows the commands |
| `public/_headers` | Response headers for a host that reads them (a strict Content-Security-Policy, caching for `/assets/`); GitHub Pages does not |
| `scripts/relative-urls.mjs` | Runs after `astro build`: makes the pages' asset paths relative, so `dist/` works from any folder |
| `scripts/check-dist.mjs` | `npm run check` |
| `.github/workflows/pages.yml` | Builds, checks and publishes the site on every push to `main` |

## Deploy

Every push to `main` builds the site, runs `npm run check` and publishes `dist/` with GitHub Pages
(`.github/workflows/pages.yml`). To use a custom domain, add it in the repository's Pages settings, then set
`DOMAIN` in `src/config.ts` and push.

## Rules for the content

- Facts only, from Clank's own documents; no invented numbers.
- Hosted tools (Codex, Claude Code) are named only as examples of hosted agents, never with a claim about a feature
  they lack.
- Nothing personal: no names, hosts, keys or private paths.
- American English.
- Text never overlaps or is clipped at any width, from 320px up; Home's demo fits the window it is shown in.
- The license is named from `LICENSE` in `src/config.ts` only.
