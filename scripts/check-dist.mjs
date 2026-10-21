// Checks a built site (dist/ by default) for what the site promises: no request to another
// host, no asset named by a root path in a page meant to work from any folder, every page link
// leading to a page, and every local file a page names present.
//
// usage: node scripts/check-dist.mjs [dir]
import { readdir, readFile, access } from 'node:fs/promises';
import { join, dirname, relative, resolve, sep } from 'node:path';

const dist = resolve(process.argv[2] ?? 'dist');
const problems = [];

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else yield path;
  }
}

const pages = new Set();
for await (const file of files(dist)) {
  if (file.endsWith('.html')) pages.add(relative(dist, file).split(sep).join('/').replace(/\.html$/, ''));
}

const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

for await (const file of files(dist)) {
  if (!/\.(html|css|js)$/.test(file)) continue;
  const text = await readFile(file, 'utf8');
  const rel = relative(dist, file);
  // Any reference that would make the browser fetch from another host.
  for (const m of text.matchAll(/(?:src|href)=["'](https?:)?\/\/([^"'/]+)|url\(["']?(?:https?:)?\/\/([^"')/]+)|@import\s+["']?(?:https?:)?\/\//g)) {
    const host = m[2] || m[3] || '?';
    const ctx = text.slice(Math.max(0, m.index - 20), m.index + 80);
    // Links people click (a href) are fine; fetched resources are not.
    if (/<a\s[^>]*$/.test(text.slice(Math.max(0, m.index - 400), m.index))) continue;
    // The page naming its own address (rel="canonical") fetches nothing.
    if (/<link\s+rel="canonical"\s*$/.test(text.slice(Math.max(0, m.index - 40), m.index))) continue;
    problems.push(`${rel}: fetches from another host (${host}): …${ctx}…`);
  }
  if (!rel.endsWith('.html') || rel === '404.html') continue;
  for (const m of text.matchAll(/(src|href)="\/(?!\/)([^"#?]*)[^"]*"/g)) {
    const name = m[2].replace(/\/$/, '');
    const isPageLink = m[1] === 'href' && (name === '' || pages.has(name));
    if (!isPageLink) problems.push(`${rel}: root path /${m[2]}`);
  }
  for (const m of text.matchAll(/(?:src|href)="(\.{1,2}\/[^"#?]+)"/g)) {
    if (!(await exists(join(dirname(file), m[1])))) problems.push(`${rel}: missing file ${m[1]}`);
  }
  for (const m of text.matchAll(/url\((["']?)(\.{1,2}\/[^)"']+)\1\)/g)) {
    if (!(await exists(join(dirname(file), m[2])))) problems.push(`${rel}: missing file ${m[2]}`);
  }
  for (const m of text.matchAll(/href="#([^"]+)"/g)) {
    if (!text.includes(`id="${m[1]}"`)) problems.push(`${rel}: no element with id "${m[1]}"`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`check-dist: ${pages.size} pages, no third-party requests, no missing files or anchors`);
