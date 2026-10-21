// Astro builds Clank's site as static files for Cloudflare Pages (output dir: dist).
// Stylesheets are inlined into each page, so a page needs only its scripts and fonts beside it;
// scripts/relative-urls.mjs then makes those references relative (see README).
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  // Keep the page's whitespace as written: compressing it drops the space between a word and a tag on the next line.
  compressHTML: false,
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  build: {
    format: 'file',
    inlineStylesheets: 'always',
    // Not "_astro": some hosts (the preview among them) reserve names that start with "_".
    assets: 'assets',
  },
  vite: {
    // Never inline scripts or fonts into the page: the Content-Security-Policy in public/_headers
    // allows only the site's own files (script-src 'self').
    build: { assetsInlineLimit: 0 },
  },
});
