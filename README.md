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
python scripts/sync-captures.py [CAPTURES] [phone=SUBFOLDER]   # copy clank-bench's recordings in (default ../clank-bench/captures)
```

Home's recordings, its flow and the features page's Flows against OpenCode alone read clank-bench's captures. Until
one is copied, a sample of the same shape stands in during development (`npm run dev`), and the page says "Sample"
wherever it shows; a build leaves out what only a sample would show (`shipped()` in `src/data/captures.ts`). The
script checks each capture, copies it, deletes its sample, and ends by saying what is still a sample.

## Where things are

| Path | What |
| --- | --- |
| `src/config.ts` | **The constants**: the domain, the repository and its links, the license, the install commands, `INSTALLER_READY`, the pages and the navigation. Change them here only. |
| `src/pages/` | One file per page: Home (`index.astro`), Why Clank, Features, Get started, Open source, FAQ, the brand page (kept out of search) and 404 |
| `src/components/` | The shared parts (`Nav`, `SubNav`, `Footer`, `InstallCommand`, `CommandBlock`, `Window`, `Crop`, `Icon`, `Logo`, `SampleTag`), and by page: `home/`, `hero/` (Home's top: Clank in use, four recordings in tabs), `flow/` (a flow's diagram, the recorded flow played back, Flows against OpenCode alone), `start/` (Get started's system switch and screens), `oss/` (the Open source page), `surfaces/` (VS Code drawn in HTML; the board and the phone from real screenshots) |
| `src/data/captures.ts` | The recordings the pages play (clank-bench's captures, in `src/data/captures/` and `src/assets/captures/` once copied), each real or its sample (`src/data/sample/`, `src/assets/sample/`), with their shapes |
| `src/assets/board/` | The board on the features page: a screenshot of Clank's VS Code extension's own board page, drawing a board file of a pendulum simulation (`BoardShot.astro` says how it was made) |
| `src/scripts/usecases.ts`, `src/scripts/flow-viewer.ts` | What plays Home's tabs and its recorded flow; `flow-play.ts` (a run replayed), `flow-layout.ts` (a flow's diagram, laid out at build time), `console-frame.ts`, `texlite.ts` (a little LaTeX made readable) and `compare.ts` serve them |
| `src/scripts/demo/` | The cell grid (`cells.ts`) and the drawn OpenCode pane (`views.ts`) that the still frames use |
| `src/scripts/crops.ts`, `src/scripts/start-screens.ts` | Still frames of the console, drawn at build time from the frames Clank's own tests keep, with example names |
| `src/scripts/system.ts` | The reader's system (Windows, macOS, Linux), one choice for every block marked `data-for` |
| `src/styles/global.css` | The design tokens (colors from Clank's console, type, spacing) and the few shared rules |
| `public/install.ps1`, `public/install.sh` | The one-line installer, served at `/install.ps1` and `/install.sh`; `INSTALLER_READY` shows the commands |
| `public/_headers` | Response headers for a host that reads them (a strict Content-Security-Policy, caching for `/assets/`); GitHub Pages does not |
| `scripts/relative-urls.mjs` | Runs after `astro build`: makes the pages' asset paths relative (an image's `srcset` too), so `dist/` works from any folder |
| `scripts/check-dist.mjs` | `npm run check` |
| `scripts/sync-captures.py` | Copies clank-bench's captures into the site, each checked first (standard library only) |
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
- Text never overlaps or is clipped at any width, from 320px up; Home's recordings keep one height, whatever plays.
- Sample data never ships: a part that shows a sample says "Sample" (`SampleTag`) in development, and a build leaves
  it out until its capture is copied.
- The license is named from `LICENSE` in `src/config.ts` only.
