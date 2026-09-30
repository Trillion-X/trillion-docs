// scripts/generate-docs.mjs
//
// Purpose: turn docs.manifest.json into the three files Mintlify reads, so navigation, site facts and colours are
// DATA in one place:
//   - docs.json  : site settings and navigation (Mintlify's config)
//   - theme.css  : Trillion's own look as CSS variables, light and dark, plus the font faces
//   - theme.js   : keeps the browser's bar colour (theme-color) on the look's page colour as light and dark switch
//   - llms.txt   : a plain index of every page for AI readers
//
// Invariants:
//   1. Adding, moving or removing a page is a manifest edit only. Nothing here names a page, group or tab.
//   2. No colour is typed here or in the manifest. Every colour comes from the Trillion app's own look records,
//      resolved by the app's own resolver (the same code that paints app.gettrillion.ai). The manifest names which
//      look is light and which is dark.
//   3. A page's title and description live in its own frontmatter, never copied into the manifest.
//   4. Nothing is guessed. A missing look or an unreadable Trillion checkout stops the run with nothing written. A
//      missing page, title or description withholds llms.txt (it would list words that do not exist) and fails the
//      run with the exact reason; docs.json, theme.css and theme.js need no page words and are still written.
//   5. `--check` writes nothing and fails when any generated file differs from what is on disk.
//
// Usage: node scripts/generate-docs.mjs [--check]
//   TRILLION_REPO (optional) points at the Trillion checkout; by default it is the folder named in the manifest
//   beside this repository.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'docs.manifest.json'), 'utf8'));
const { site } = manifest;
const failures = [];
const pageFailures = [];

// ---- pages: routes from the manifest, words from each page's frontmatter ----

function frontmatter(body) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(body);
  if (!match) return {};
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!pair) continue;
    fields[pair[1]] = pair[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return fields;
}

function readPage(route) {
  const file = ['.mdx', '.md'].map((extension) => join(root, `${route}${extension}`)).find(existsSync);
  if (!file) {
    pageFailures.push(`${route}: no ${route}.mdx or ${route}.md`);
    return null;
  }
  const fields = frontmatter(readFileSync(file, 'utf8'));
  for (const field of ['title', 'description']) {
    if (!fields[field]) pageFailures.push(`${route}: frontmatter has no ${field}`);
  }
  return { route, title: fields.title, description: fields.description };
}

const routes = manifest.navigation.flatMap((tab) => tab.groups.flatMap((group) => group.pages));
for (const route of routes.filter((route, index) => routes.indexOf(route) !== index)) {
  pageFailures.push(`${route}: listed more than once in the navigation`);
}
const pages = routes.map(readPage).filter(Boolean);

// ---- look: the app's own look records through the app's own resolver ----

const trillionRepo = process.env[site.look.repository.environmentOverride]
  ?? join(root, '..', site.look.repository.directoryBesideThisOne);
const looksFile = join(trillionRepo, site.look.looks);
const resolverFile = join(trillionRepo, site.look.resolver);
for (const file of [looksFile, resolverFile]) {
  if (!existsSync(file)) failures.push(`look: cannot read ${file} (set ${site.look.repository.environmentOverride})`);
}

let palettes = null;
if (!failures.some((failure) => failure.startsWith('look:'))) {
  const { resolveScreenLookPalette } = await import(pathToFileURL(resolverFile).href);
  const looks = JSON.parse(readFileSync(looksFile, 'utf8')).themes.map((theme) => theme.payload);
  palettes = {};
  for (const mode of ['light', 'dark']) {
    const look = looks.find((candidate) => candidate.id === site.look[mode]);
    if (!look) failures.push(`look: ${site.look.looks} has no look ${site.look[mode]}`);
    else palettes[mode] = resolveScreenLookPalette(look);
  }
}

if (failures.length) {
  console.error(`Nothing was written:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`);
  process.exit(1);
}

// One reading of a resolved look variable, so docs.json and theme.css can never disagree.
const role = (mode, name) => palettes[mode][`--${name}`];

// ---- docs.json ----

const fontOf = ({ family, weight }) => {
  const face = site.fontFaces.find((candidate) => candidate.family === family && candidate.weight === weight);
  return { family, weight, source: face.source, format: 'woff2' };
};

const docsJson = {
  $schema: 'https://mintlify.com/docs.json',
  theme: 'mint',
  name: site.name,
  description: site.description,
  colors: {
    primary: role('light', 'accent-primary'),
    light: role('dark', 'accent-primary'),
    dark: role('light', 'button-primary-bg-hover'),
  },
  background: {
    color: { light: role('light', 'surface-base'), dark: role('dark', 'surface-base') },
  },
  appearance: { default: site.look.appearance, strict: false },
  logo: { light: '/logo/light.svg', dark: '/logo/dark.svg', href: site.canonicalUrl },
  favicon: '/favicon.svg',
  fonts: { heading: fontOf(site.fonts.heading), body: fontOf(site.fonts.body) },
  search: { prompt: site.searchPrompt },
  metadata: { timestamp: true },
  seo: {
    indexing: 'navigable',
    metatags: {
      canonical: site.canonicalUrl,
      description: site.social.description,
      keywords: site.keywords.join(', '),
      robots: 'index, follow',
      googlebot: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
      'application-name': site.name,
      'apple-mobile-web-app-title': site.name,
      'format-detection': 'telephone=no',
      'og:site_name': site.social.siteName,
      'og:type': 'website',
      'og:url': site.canonicalUrl,
      'og:title': site.social.title,
      'og:description': site.social.description,
      'og:image': site.social.image,
      'og:image:alt': site.social.imageAlt,
      'twitter:card': 'summary_large_image',
      'twitter:title': site.social.title,
      'twitter:description': site.social.description,
      'twitter:image': site.social.image,
      'twitter:image:alt': site.social.imageAlt,
    },
  },
  navbar: {
    links: site.navbar.links.map(({ label, href }) => ({ label, href })),
    primary: { type: 'button', label: site.navbar.primary.label, href: site.navbar.primary.href },
  },
  navigation: {
    tabs: manifest.navigation.map((tab) => ({
      tab: tab.tab,
      groups: tab.groups.map((group) => ({ group: group.group, pages: [...group.pages] })),
    })),
  },
  contextual: { options: [...site.contextual] },
};

// ---- theme.css: every resolved look variable, renamed into the --trillion- namespace ----

const variables = (palette) => Object.entries(palette)
  .map(([name, value]) => `  --trillion-${name.slice(2)}: ${value};`)
  .join('\n');

const themeCss = [
  '/* Generated from docs.manifest.json and the Trillion app\'s own looks. Run npm run docs:generate. */',
  ...site.fontFaces.map((face) => `@font-face {
  font-family: "${face.family}";
  src: url("${face.source}") format("woff2");
  font-style: normal;
  font-weight: ${face.weight};
  font-display: swap;
}`),
  `/* Light: the "${site.look.light}" look. */
:root {
  color-scheme: light;
${variables(palettes.light)}
}`,
  `/* Dark: the "${site.look.dark}" look. */
html.dark {
  color-scheme: dark;
${variables(palettes.dark)}
}`,
].join('\n\n');

// ---- llms.txt ----

// ---- theme.js: Mintlify switches html.light / html.dark; the browser bar follows the page colour ----

const themeJs = `// Generated from docs.manifest.json and the Trillion app's own looks. Run npm run docs:generate.
(() => {
  const colours = ${JSON.stringify({ light: role('light', 'surface-base'), dark: role('dark', 'surface-base') })};
  const root = document.documentElement;
  const paint = () => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.append(meta);
    }
    meta.content = root.classList.contains('dark') ? colours.dark : colours.light;
  };
  paint();
  new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ['class'] });
})();
`;

const pageByRoute = new Map(pages.map((page) => [page.route, page]));
const llms = pageFailures.length ? null : [
  `# ${site.social.siteName}`,
  '',
  `> ${site.description}`,
  '',
  ...manifest.navigation.flatMap((tab) => tab.groups.flatMap((group) => [
    `## ${group.group === tab.tab ? tab.tab : `${tab.tab}: ${group.group}`}`,
    '',
    ...group.pages.map((route) => {
      const page = pageByRoute.get(route);
      return `- [${page.title}](${site.canonicalUrl}/${route === 'index' ? '' : route}): ${page.description}`;
    }),
    '',
  ])),
  `Open Trillion: ${site.navbar.primary.href}`,
].join('\n');

// ---- write or check ----

const outputs = {
  'docs.json': `${JSON.stringify(docsJson, null, 2)}\n`,
  'theme.css': `${themeCss}\n`,
  'theme.js': themeJs,
  ...(llms ? { 'llms.txt': `${llms}\n` } : {}),
};

if (process.argv.includes('--check')) {
  const stale = Object.entries(outputs)
    .filter(([file, body]) => !existsSync(join(root, file)) || readFileSync(join(root, file), 'utf8') !== body)
    .map(([file]) => file);
  if (stale.length) {
    console.error(`Out of date, run npm run docs:generate: ${stale.join(', ')}`);
    process.exit(1);
  }
  console.log('generated files are current');
} else {
  for (const [file, body] of Object.entries(outputs)) writeFileSync(join(root, file), body);
  console.log(`wrote ${Object.keys(outputs).join(', ')} for ${pages.length} pages`);
}

if (pageFailures.length) {
  console.error(`llms.txt was not written:\n${pageFailures.map((failure) => `  - ${failure}`).join('\n')}`);
  process.exit(1);
}
