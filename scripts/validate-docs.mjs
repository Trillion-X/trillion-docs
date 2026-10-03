// scripts/validate-docs.mjs
//
// Purpose: check that the pages and the navigation agree, and that every link inside the docs lands on a page.
//
// Invariants:
//   1. Every .mdx/.md page is in the navigation (an unlisted page is unreachable), and every navigation route has a
//      page (the generator refuses a missing one too).
//   2. Every site-relative link in a page ("/connect/codex", "/use/files#sharing") names a route in the navigation
//      or a file that exists in this repository.
//   3. Reads only; prints every failure, exits 1 when there is any.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'docs.manifest.json'), 'utf8'));
const pageFile = /\.(mdx|md)$/;
// What is never published is what .mintignore says (a folder ends with /), so a page is judged by the same list Mintlify uses.
const ignored = readFileSync(join(root, '.mintignore'), 'utf8').split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
const isIgnored = (path, directory) => ignored.some(entry => (entry.endsWith('/') ? `${path}/` === entry || path.startsWith(entry) : path === entry)) || (directory && path === '.git');

function walk(directory, files = []) {
  for (const name of readdirSync(directory)) {
    const path = relative(root, join(directory, name));
    const isDirectory = statSync(join(directory, name)).isDirectory();
    if (isIgnored(path, isDirectory)) continue;
    if (isDirectory) walk(join(directory, name), files);
    else if (pageFile.test(name)) files.push(path);
  }
  return files;
}

const routes = new Set(manifest.navigation.flatMap((tab) => tab.groups.flatMap((group) => group.pages)));
const files = walk(root);
const failures = [];

for (const file of files) {
  const route = file.replace(pageFile, '');
  if (!routes.has(route)) failures.push(`${file}: page is not in the navigation (add "${route}" to docs.manifest.json)`);
}
for (const route of routes) {
  if (!files.includes(`${route}.mdx`) && !files.includes(`${route}.md`)) failures.push(`${route}: in the navigation but has no page`);
}

const linkPatterns = [/\]\((\/[^)\s#?]*)[^)]*\)/g, /href=["'](\/[^"'#?]*)[^"']*["']/g];
for (const file of files) {
  const body = readFileSync(join(root, file), 'utf8');
  const targets = new Set(linkPatterns.flatMap((pattern) => [...body.matchAll(pattern)].map(([, target]) => target)));
  for (const target of targets) {
    const route = target.replace(/^\/+|\/+$/g, '') || 'index';
    if (routes.has(route) || existsSync(join(root, target))) continue;
    failures.push(`${file}: link to ${target} lands on no page`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`docs ok: ${files.length} pages, all in the navigation, all links land`);
