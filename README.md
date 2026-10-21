# Clank's website

The public website of Clank: one static page, built with [Astro](https://astro.build) and plain
CSS, hosted on Cloudflare Pages. It loads nothing from other hosts: no trackers, no analytics, no cookies, fonts
served from the site itself.

## Develop

Needs Node 22 or newer.

```
npm install          # once
npm run dev          # http://localhost:4321, reloads as you edit
npm run build        # the site, in dist/
npm run preview      # serves dist/ to check the build
npm run check        # checks dist/: no request to another host, no missing file
```

## Where things are

| Path | What |
| --- | --- |
| `src/config.ts` | **The constants**: the domain (`DOMAIN`), the GitHub repository (`GITHUB_URL`), the license, the install commands, the page's title and description. Change them here only. |
| `src/pages/index.astro` | The page: its sections, in order |
| `src/components/` | One file per section (`Hero`, `ConsoleDemo`, `HowItWorks`, `Features`, `Why`, `Flows`, `GetStarted`, `Privacy`, `OpenSource`, `Faq`, `FinalCta`) and the shared parts (`Nav`, `Footer`, `InstallCommand`, `Logo`, `Icon`) |
| `src/scripts/console-demo.ts` | What plays the console demo (a flow running in the Monitor's Flow view) |
| `src/styles/global.css` | The design tokens (colors from Clank's console, type, spacing) and the few shared rules |
| `public/_headers` | Cloudflare Pages response headers: a strict Content-Security-Policy, caching for `/assets/` |
| `scripts/relative-urls.mjs` | Runs after `astro build`: makes the page's asset paths relative, so `dist/` works from any folder |
| `scripts/check-dist.mjs` | `npm run check` |

## Placeholders before launch

- **The domain.** `DOMAIN` in `src/config.ts` is `[DOMAIN]`. Visitors see it only inside the install commands.
  Canonical and social URLs are written only once it is set.
- **The GitHub link.** `GITHUB_URL` in `src/config.ts` points at a placeholder until Clank's repository is public.
- **The install scripts.** The page shows `curl -fsSL https://[DOMAIN]/install.sh | sh` and
  `irm https://[DOMAIN]/install.ps1 | iex`; the scripts are `public/install.sh` and `public/install.ps1`, served at
  those addresses. `INSTALLER_READY` in `src/config.ts` shows the commands (false: the boxes say it is coming).
- **The license.** `LICENSE` in `src/config.ts` names it (AGPL-3.0); every page reads it from there.

## Deploy to Cloudflare Pages

1. In the Cloudflare dashboard: **Workers & Pages**, **Create**, **Pages**, **Connect to Git**, and pick this
   repository.
2. Build settings: framework preset **Astro**; build command `npm run build`; build output directory `dist`.
   `.node-version` asks for Node 22.
3. Optional: the environment variable `ASTRO_TELEMETRY_DISABLED=1` keeps Astro from sending anonymous usage data
   during the build (on your own computer: `npx astro telemetry disable`).
4. Once the domain is chosen: **Custom domains** in the project, then set `DOMAIN` in `src/config.ts` and push.

Each push to `main` deploys; other branches get preview addresses.

To deploy by hand instead of from Git: `npm run build`, then `npx wrangler pages deploy dist --project-name <name>`.

## Rules for the content

- Facts only, from Clank's own documents; no invented numbers.
- Hosted tools (Codex, Claude Code) are named only as examples of hosted agents, never with a claim about a feature
  they lack.
- Nothing personal: no names, hosts, keys or private paths.
- American English.
- Text never overlaps or is clipped at any width, from 320px up.
