// scripts/validate-public-boundary.mjs
//
// Purpose: keep things that must never be published out of the public docs: paths on someone's computer, names of
// retired products, leftover starter-kit text and unfinished-work markers.
//
// Invariants:
//   1. Every text file in the repository is read, except dependencies, git data and this checker.
//   2. The blocked phrases are one list below; adding one is one row.
//   3. Reads only; prints every hit with its file, exits 1 when there is any.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url);
const root = resolve(dirname(self), '..');
const textFiles = new Set(['.css', '.js', '.json', '.md', '.mdx', '.mjs', '.svg', '.txt', '.yml', '.yaml']);
const skipped = new Set(['.git', 'node_modules', 'package-lock.json']);

const blocked = [
  { phrase: '/Users/', why: 'a path on one person\'s computer' },
  { phrase: 'Bitfield', why: 'a retired product name' },
  { phrase: 'Runtime Kit', why: 'a retired product name' },
  { phrase: 'TrillionPresenter', why: 'a retired app' },
  { phrase: 'Mint Starter Kit', why: 'leftover starter-kit text' },
  { phrase: 'starter.mintlify.com', why: 'leftover starter-kit link' },
  { phrase: 'hi@mintlify.com', why: 'leftover starter-kit address' },
  { phrase: 'TODO', why: 'an unfinished-work marker' },
  { phrase: 'Lorem ipsum', why: 'placeholder text' },
];

function walk(directory, files = []) {
  for (const name of readdirSync(directory)) {
    if (skipped.has(name)) continue;
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (textFiles.has(extname(name)) && path !== self) files.push(path);
  }
  return files;
}

const failures = [];
for (const file of walk(root)) {
  const body = readFileSync(file, 'utf8');
  for (const { phrase, why } of blocked) {
    if (body.includes(phrase)) failures.push(`${relative(root, file)}: contains "${phrase}" (${why})`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('public boundary ok');
