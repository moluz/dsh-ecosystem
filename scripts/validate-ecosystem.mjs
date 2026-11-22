/**
 * Validate data/ecosystem.json: structure, required fields and cross-references.
 *
 *   node scripts/validate-ecosystem.mjs
 *
 * Runs in CI; no dependencies (plain Node) so the data stays cheap to check.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const FILE = path.join(import.meta.dirname, '..', 'data', 'ecosystem.json');

let failures = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`  FAIL ${name}: ${error.message}`);
  }
};

let doc;
check('data/ecosystem.json parses', () => {
  doc = JSON.parse(readFileSync(FILE, 'utf8'));
});
if (doc === undefined) {
  console.error('\nvalidate-ecosystem: cannot continue without a parsed document');
  process.exit(1);
}

check('schemaVersion is 1', () => {
  if (doc.schemaVersion !== 1) throw new Error(`got ${doc.schemaVersion}`);
});

check('generatedAt is an ISO timestamp', () => {
  if (typeof doc.generatedAt !== 'string' || Number.isNaN(Date.parse(doc.generatedAt))) {
    throw new Error(`got ${JSON.stringify(doc.generatedAt)}`);
  }
});

check('dsh.version and profile bundles are present', () => {
  if (typeof doc.dsh?.version !== 'string' || doc.dsh.version === '') throw new Error('dsh.version missing');
  const bundles = doc.dsh?.profile?.enabledBundles;
  if (!Array.isArray(bundles) || bundles.length === 0) throw new Error('enabledBundles missing');
  for (const bundle of bundles) {
    if (typeof bundle.name !== 'string' || typeof bundle.version !== 'string') {
      throw new Error(`bad bundle entry ${JSON.stringify(bundle)}`);
    }
  }
});

check('pluginMarket declares index, title and total', () => {
  if (typeof doc.pluginMarket?.indexUrl !== 'string') throw new Error('indexUrl missing');
  if (typeof doc.pluginMarket?.indexTitle !== 'string') throw new Error('indexTitle missing');
  if (!Number.isInteger(doc.pluginMarket?.totalEntries)) throw new Error('totalEntries must be an integer');
});

const REQUIRED_PLUGIN_FIELDS = ['name', 'repo', 'version', 'published', 'category', 'summary', 'borrow', 'notBorrow'];

check('adjacentPlugins entries are complete and unique', () => {
  const list = doc.adjacentPlugins;
  if (!Array.isArray(list)) throw new Error('adjacentPlugins must be an array');
  const seen = new Set();
  list.forEach((entry, index) => {
    for (const field of REQUIRED_PLUGIN_FIELDS) {
      if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
        throw new Error(`entry[${index}] (${entry.name ?? '?'}) missing "${field}"`);
      }
    }
    if (!/^https:\/\/github\.com\//.test(entry.repo)) throw new Error(`${entry.name}: repo must be a GitHub URL`);
    if (seen.has(entry.name)) throw new Error(`duplicate plugin ${entry.name}`);
    seen.add(entry.name);
  });
});

check('localSiblingProjects entries are complete', () => {
  const list = doc.localSiblingProjects;
  if (!Array.isArray(list) || list.length === 0) throw new Error('localSiblingProjects missing');
  for (const project of list) {
    if (typeof project.name !== 'string' || typeof project.version !== 'string') {
      throw new Error(`bad sibling project ${JSON.stringify(project)}`);
    }
  }
});

const adjacent = Array.isArray(doc.adjacentPlugins) ? doc.adjacentPlugins.length : 0;
console.log(
  `\nvalidate-ecosystem: schema=${doc.schemaVersion} dsh=${doc.dsh.version} adjacent=${adjacent} market=${doc.pluginMarket?.totalEntries} -> ${failures === 0 ? 'PASS' : `${failures} failure(s)`}`,
);
process.exitCode = failures === 0 ? 0 : 1;
