# Trillion docs

The public help site for Trillion at https://docs.gettrillion.ai, built with Mintlify: how to connect your AI, use Trillion, install its apps, and every tool it gives your AI.

## Files

| File | Purpose |
|---|---|
| `docs.manifest.json` | The one place site facts and navigation live: name, description, search prompt, navbar links, SEO text, fonts, which Trillion looks are light and dark, and every tab, group and page route. Adding a page is one route here. |
| `scripts/generate-docs.mjs` | Writes `docs.json`, `theme.css`, `theme.js` and `llms.txt` from the manifest; `--check` fails when any of them is out of date. Colours come from the Trillion app's own looks through the app's own resolver. |
| `scripts/validate-docs.mjs` | Fails when a page is missing from the navigation, a navigation route has no page, or a link inside a page lands nowhere. What counts as a page skips everything `.mintignore` keeps off the site. |
| `scripts/make-reference.mjs` | Writes `reference/overview.mdx` and one `reference/<group>.mdx` per group from `scripts/reference/tools.json` (the live `tools/list` as a new account sees it) and `scripts/reference/groups.json` (which page each tool is on); refuses when a live tool is unplaced, placed twice or no longer exists. |
| `scripts/make-ways-in.mjs` | Writes `apps/overview.mdx` (every way to reach Trillion) from the Trillion app's own `src/devices.json` (apps per device, install link per system or honest not-yet words) and `src/ai-clients.json` (every AI app it connects to); `--check` fails when the page and the records differ. Names no device or AI app. |
| `scripts/ways-in.json` | Settings for `make-ways-in.mjs`: which records it reads, which docs page tells more about a row (by row id), the app screen a row with no docs page links to, and the page's words. |
| `scripts/validate-public-boundary.mjs` | Fails when a file holds a local computer path, a retired product name, leftover starter-kit text or an unfinished-work marker. |
| `docs.json` | Generated Mintlify settings and navigation. Never edit by hand. |
| `theme.css` | Generated: the font faces plus every look variable as `--trillion-*`, light under `:root`, dark under `html.dark`. Never edit by hand. |
| `theme.js` | Generated: keeps the browser's bar colour (`theme-color`) on the look's page colour as light and dark switch. Never edit by hand. |
| `llms.txt` | Generated plain index of every page for AI readers. Never edit by hand. |
| `style.css` | Dresses Mintlify's page in the look by role (display face on titles, thread-red link underline, pill "Open Trillion" button, card and code radii). Names variables only, never colours. |
| `index.mdx` | The welcome page: what Trillion is, and cards to the main guides. |
| `quickstart.mdx`, `connect/`, `use/`, `apps/`, `harness/`, `reference/` | The guide and tool-reference pages; each page's title and description live in its own frontmatter. |
| `images/` | Screenshots used by the pages. |
| `logo/light.svg` | Black needle with the red thread on a transparent background, shown in light mode. |
| `logo/dark.svg` | White needle with the red thread on a transparent background, shown in dark mode. |
| `favicon.svg` | White needle on black, squared, for the browser tab. |
| `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | The same mark as square PNGs, made with `sips` from the white-needle-on-black brand PNG padded with black. |
| `fonts/` | SF Pro Text (400, 500, 600) and Recoleta (400, 500, 600), the faces the Trillion app and gettrillion.ai use. |
| `package.json` | The scripts below, the pinned Mintlify CLI, and Node 24 LTS pinned as a dev dependency so every script runs on a Node the Mintlify CLI accepts (it refuses Node 25). |
| `package-lock.json` | Exact installed versions. |
| `.gitignore` | Keeps `node_modules/` and `.DS_Store` out of the repository. |
| `.mintignore` | Keeps this README, `scripts/` and `node_modules/` off the published site. |

## Key scripts

| Script | What it does |
|---|---|
| `npm run docs:generate` | Regenerates `docs.json`, `theme.css`, `theme.js`, `llms.txt`. A missing look writes nothing; a missing page, title or description withholds `llms.txt` and fails with the exact list. |
| `npm run docs:ways-in` | Rewrites `apps/overview.mdx` from the Trillion app's device and AI-app records. |
| `npm run docs:check` | Every-way-in page matches the app's records, generated files current, public boundary clean, pages and navigation agree, links land, then `mint validate`. |
| `npm run dev` | Local preview with `npx mint dev`. |

The generator reads the Trillion checkout beside this repository (`../trillion`); set `TRILLION_REPO` to point elsewhere.

## How colours are chosen

| Mintlify setting | Look variable | Value today |
|---|---|---|
| `colors.primary` | light look `--accent-primary` | thread red `#ff1d1d` |
| `colors.light` (dark mode accent) | dark look `--accent-primary` | `#ff1d1d` |
| `colors.dark` (buttons and hover in light mode) | light look `--button-primary-bg-hover` | `#e01212` |
| `background.color.light` | light look `--surface-base` | warm paper `#f4f0e8` |
| `background.color.dark` | dark look `--surface-base` | pitch black `#000000` |

The light look is `trillion` (the look every new Trillion account starts with) and the dark look is `trillion-black`, both from `src/workspace/looks.json` in the Trillion repository. Changing a look there and running `npm run docs:generate` repaints the docs.

## Dependencies

**Depends on:** the Trillion repository's `src/workspace/looks.json` and `parts/screen-look/read-data/resolve-screen-look-palette.js` (at generate time only; the generated files are committed), the `mint` CLI, Node 24 LTS (installed by `npm install`).

**Depended on by:** Mintlify's hosting for docs.gettrillion.ai, and the links from gettrillion.ai and app.gettrillion.ai.
