// Writes the Trillion docs reference pages (reference/overview.mdx and one reference/<group>.mdx per group in
// groups.json) from the live MCP tools/list answer saved in tools.json. Every tool must be in exactly one group.
// Usage: node scripts/make-reference.mjs .   (refresh scripts/reference/tools.json from the live tools/list first)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = join(dirname(fileURLToPath(import.meta.url)), 'reference');
const docsRoot = process.argv[2];
if (!docsRoot) throw new Error('Usage: node make-reference.mjs <docs root>');
const tools = JSON.parse(readFileSync(join(here, 'tools.json'), 'utf8')).result.tools;
const { groups, say, examples } = JSON.parse(readFileSync(join(here, 'groups.json'), 'utf8'));

const byName = new Map(tools.map(tool => [tool.name, tool]));
const placed = groups.flatMap(group => group.tools);
const unknown = placed.filter(name => !byName.has(name));
const twice = placed.filter((name, index) => placed.indexOf(name) !== index);
const missing = tools.map(tool => tool.name).filter(name => !placed.includes(name));
if (unknown.length || twice.length || missing.length) {
  throw new Error(`groups.json does not match the live tools: unknown ${unknown}, twice ${twice}, missing ${missing}`);
}

// Only names with an underscore: 'network', 'community' and 'decide' are also plain words.
const names = [...byName.keys()].filter(name => name.includes('_')).sort((a, b) => b.length - a.length);
const namePattern = new RegExp(`\\b(${names.join('|')})\\b`, 'g');
const escapeText = text => text.replace(/[{}<>]/g, ch => `&#${ch.charCodeAt(0)};`);
// Prose for MDX: tool names become inline code, everything else is escaped so braces and angle brackets stay text.
const prose = text => text.split(namePattern).map((part, index) => (index % 2 ? `\`${part}\`` : escapeText(part))).join('');

const typeOf = schema => {
  if (!schema) return 'any';
  if (Array.isArray(schema.type)) return schema.type.join(' or ');
  if (schema.type) return schema.type === 'array' && schema.items?.type ? `${schema.items.type}[]` : schema.type;
  const options = schema.anyOf ?? schema.oneOf;
  if (options) return [...new Set(options.map(typeOf))].join(' or ');
  return 'any';
};

// One row per input, nested fields named by their path (evidence[].ref), so every field shows at a glance.
const rows = (schema, prefix = '') => {
  const required = new Set(schema?.required ?? []);
  return Object.entries(schema?.properties ?? {}).flatMap(([name, field]) => {
    const path = `${prefix}${name}`;
    const nested = field.type === 'array' ? field.items : field;
    const words = [field.description ? prose(field.description) : '', field.enum ? `One of ${field.enum.map(value => `\`${value}\``).join(', ')}.` : '']
      .filter(Boolean).join(' ').replace(/\|/g, '\\|');
    const row = `| \`${path}\` | ${typeOf(field).replace(/\|/g, '\\|')} | ${required.has(name) ? 'Yes' : ''} | ${words} |`;
    return [row, ...(nested?.properties ? rows(nested, `${path}${field.type === 'array' ? '[]' : ''}.`) : [])];
  });
};
const params = schema => {
  const body = rows(schema);
  return body.length ? ['| Input | Type | Required | What it is |', '| --- | --- | --- | --- |', ...body].join('\n') : '';
};

const sample = (name, schema) => {
  if (!schema) return `<${name}>`;
  if (schema.enum) return schema.enum[0];
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === 'boolean') return true;
  if (type === 'integer' || type === 'number') return 1;
  if (type === 'array') return [sample(name, schema.items)];
  if (type === 'object' || schema.properties) {
    return Object.fromEntries((schema.required ?? []).map(key => [key, sample(key, schema.properties?.[key])]));
  }
  return `<${name}>`;
};

const exampleOf = tool => {
  if (examples[tool.name]) return examples[tool.name];
  const written = tool.description.match(/Complete working example of this call's arguments: (\{.*\})$/);
  if (written) return JSON.parse(written[1]);
  return sample(tool.name, tool.inputSchema);
};

const descriptionOf = tool => {
  const text = say[tool.name] ?? tool.description;
  return text.replace(/ Complete working example of this call's arguments: \{.*\}$/, ' The example below is a complete working one.');
};

const effectOf = tool => {
  const hints = tool.annotations ?? {};
  if (hints.readOnlyHint) return 'Reads only';
  if (hints.destructiveHint) return 'Changes things and can remove them';
  return 'Changes things';
};

const toolSection = tool => {
  const example = JSON.stringify(exampleOf(tool), null, 2);
  const fields = params(tool.inputSchema);
  return [
    `## ${tool.annotations?.title ?? tool.name}`,
    '',
    `\`${tool.name}\` · ${effectOf(tool)}`,
    '',
    prose(descriptionOf(tool)),
    '',
    fields ? `**Inputs**\n\n${fields}` : 'It takes no inputs.',
    '',
    '```json Example',
    example,
    '```',
  ].join('\n');
};

const frontmatter = (title, description) => `---\ntitle: "${title}"\ndescription: "${description}"\n---\n`;

mkdirSync(join(docsRoot, 'reference'), { recursive: true });
for (const group of groups) {
  const page = [
    frontmatter(group.title, group.description),
    prose(group.intro),
    '',
    'You do not call these tools yourself. You ask your AI in plain words, and it picks the tool. This page shows what each one does, so you know what to ask for.',
    '',
    group.tools.map(name => toolSection(byName.get(name))).join('\n\n'),
    '',
  ].join('\n');
  writeFileSync(join(docsRoot, 'reference', `${group.id}.mdx`), page);
}

const cards = groups.map(group => `  <Card title="${group.title}" icon="${group.icon}" href="/reference/${group.id}">\n    ${group.description}\n  </Card>`).join('\n');
const index = groups.map(group => group.tools.map(name => {
  const tool = byName.get(name);
  return `| [\`${name}\`](/reference/${group.id}) | ${tool.annotations?.title ?? name} | ${group.title} | ${effectOf(tool)} |`;
}).join('\n')).join('\n');

writeFileSync(join(docsRoot, 'reference', 'overview.mdx'), [
  frontmatter('Tools reference', `Every tool Trillion gives your AI, grouped by the job you want done. ${tools.length} tools in all.`),
  'When your AI is connected to Trillion, it gets a set of tools. You never call them by name: you ask in plain words, like "Use Trillion to help me decide what to focus on this week", and your AI picks the tools that do it.',
  '',
  'These pages list every tool, grouped by the job a person does, with what it does, what it takes, and an example of what your AI sends.',
  '',
  '<CardGroup cols={2}>',
  cards,
  '</CardGroup>',
  '',
  '## How the tools work',
  '',
  '- **One address, every AI.** Every AI app reaches the same tools at `https://app.gettrillion.ai/mcp`, and every AI signed in to your account reads and writes the same Trillion. What you start in one AI, another can pick up.',
  '- **Signed in as you.** Your AI signs in with your passkey once. It only ever reaches your own Trillion and the spaces you are in.',
  '- **Reads only, or changes things.** Each tool is marked so your AI app knows which ones only read and which change something. Apps that ask before a tool runs use this to decide what to ask about.',
  '- **Safe to send twice.** Tools that start something take a `request_key` or `source_id`: sending the same one again returns what was already started instead of doing it twice.',
  '- **Some tools come with a paid plan.** The free plan includes 5 decisions a month and keeps none of them. A paid plan keeps every decision, note and result, and adds the Workshop, files, shared spaces, the network, handing work between your AIs, and fast picks with `score_candidates`. Communities and connecting any AI app come with every account.',
  '',
  '## Every tool',
  '',
  '| Tool | What it does | Page | Effect |',
  '| --- | --- | --- | --- |',
  index,
  '',
].join('\n'));

console.log(`wrote ${groups.length + 1} pages for ${tools.length} tools`);
