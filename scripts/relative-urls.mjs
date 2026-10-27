// After `astro build`: make each page's references to its own files relative ("./assets/…"
// instead of "/assets/…"), so the built site works from any folder. Pages in sub-folders get
// "../" as many times as they are deep. The 404 page keeps root paths, since Cloudflare Pages
// serves it at any address.
//
// With --preview, links between pages also point at their files ("./features.html" for
// "/features"), for hosts without Cloudflare's clean addresses, such as the preview.
//
// usage: node scripts/relative-urls.mjs [dir] [--preview]
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep, resolve } from 'node:path';

const args = process.argv.slice(2);
const preview = args.includes('--preview');
const dist = resolve(args.find((a) => !a.startsWith('--')) ?? 'dist');

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

const pages = new Set();
for await (const file of htmlFiles(dist)) pages.add(relative(dist, file).split(sep).join('/').replace(/\.html$/, ''));

let changed = 0;
for await (const file of htmlFiles(dist)) {
  const rel = relative(dist, file);
  if (rel === '404.html' && !preview) continue;
  const depth = rel.split(sep).length - 1;
  const prefix = depth === 0 ? './' : '../'.repeat(depth);
  const before = await readFile(file, 'utf8');
  let after = before
    .replace(/url\((["']?)\/(?!\/)/g, `url($1${prefix}`)
    .replace(/(src|href)="\/(?!\/)([^"#?]*)([^"]*)"/g, (whole, attr, path, rest) => {
      const name = path.replace(/\/$/, '');
      const isPage = name === '' || pages.has(name);
      if (attr === 'href' && isPage && preview) return `${attr}="${prefix}${name || 'index'}.html${rest}"`;
      if (attr === 'href' && isPage) return whole;
      return `${attr}="${prefix}${path}${rest}"`;
    })
    // An image's srcset: each of its comma-separated addresses ("/assets/a.webp 640w, /assets/b.webp 960w").
    .replace(/srcset="([^"]*)"/g, (whole, list) => `srcset="${list.replace(/(^|,\s*)\/(?!\/)/g, `$1${prefix}`)}"`);
  if (after !== before) {
    await writeFile(file, after);
    changed++;
  }
}
console.log(`relative-urls: ${changed} page(s) rewritten in ${relative(process.cwd(), dist) || '.'}${preview ? ' (preview)' : ''}`);
