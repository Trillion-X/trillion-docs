// scripts/check-live-docs.mjs
//
// Purpose: say whether the docs people read are the docs in this repository. The site's /llms.txt is made from the
//   same pages as the repository's llms.txt, so when the two differ the published site is older than the repository.
// Invariants:
//   1. It reads only the public site; it holds no key and changes nothing.
//   2. It waits up to --wait-seconds for a new build to appear, then fails with what to fix, never silently.
// Usage: node scripts/check-live-docs.mjs [--origin https://docs.gettrillion.ai] [--wait-seconds 0]

import { readFileSync } from 'node:fs';

const arg = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? process.argv[at + 1] : fallback;
};
const origin = arg('origin', 'https://docs.gettrillion.ai');
const waitSeconds = Number(arg('wait-seconds', '0'));
const wanted = readFileSync(new URL('../llms.txt', import.meta.url), 'utf8').trim();
const deadline = Date.now() + waitSeconds * 1000;

for (;;) {
  const response = await fetch(`${origin}/llms.txt`, { headers: { 'cache-control': 'no-cache' } }).catch(error => ({ ok: false, status: String(error) }));
  const live = response.ok ? (await response.text()).trim() : '';
  if (live === wanted) {
    console.log(`${origin} shows this repository's docs.`);
    process.exit(0);
  }
  if (Date.now() >= deadline) break;
  await new Promise(resolve => setTimeout(resolve, 30000));
}
console.error(`${origin} does not show this repository's docs: its /llms.txt differs from llms.txt here.`);
console.error('Mintlify is not building from this repository. Fix: https://app.mintlify.com/settings/project/git-settings, organization Trillion-X, repository trillion-docs, branch main.');
process.exit(1);
