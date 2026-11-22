/**
 * Publish this repository's working tree to GitHub via the REST API.
 *
 *   GH_TOKEN=... DSH_ECO_OWNER=moluz DSH_ECO_REPO=dsh-ecosystem node scripts/publish-github.mjs
 *
 * Used because the sandbox cannot reach github.com with git; the DSH GitHub MCP
 * server can, and this reuses the same user-level token.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const OWNER = process.env.DSH_ECO_OWNER ?? 'moluz';
const REPO = process.env.DSH_ECO_REPO ?? 'dsh-ecosystem';
const BRANCH = process.env.DSH_ECO_BRANCH ?? 'main';
const MESSAGE = process.env.DSH_ECO_MESSAGE ?? 'chore: sync working tree';
const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) throw new Error('GH_TOKEN missing');

const root = process.cwd();
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\u0000')
  .map((line) => line.trim())
  .filter((line) => line !== '')
  .filter((line) => process.env.DSH_ECO_PUBLISH_WORKFLOWS === '1' || !line.startsWith('.github/'));

const api = (pathname, init = {}) =>
  fetch(`https://api.github.com/repos/${OWNER}/${REPO}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'dsh-ecosystem-publish',
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

async function json(response) {
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!response.ok) throw new Error(`${response.status} ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  return body;
}

let baseSha = null;
let baseTree = null;
let deletePlaceholder = false;
try {
  const ref = await json(await api(`/git/ref/heads/${BRANCH}`));
  baseSha = ref.object.sha;
  baseTree = (await json(await api(`/git/commits/${baseSha}`))).tree.sha;
} catch (error) {
  console.log('empty repository: bootstrapping', BRANCH);
  await json(
    await api('/contents/.bootstrap', {
      method: 'PUT',
      body: JSON.stringify({ message: 'chore: bootstrap', content: Buffer.from('bootstrap\n').toString('base64') }),
    }),
  );
  baseSha = (await json(await api(`/git/ref/heads/${BRANCH}`))).object.sha;
  baseTree = (await json(await api(`/git/commits/${baseSha}`))).tree.sha;
  deletePlaceholder = true;
}

const tree = files.map((file) => ({
  path: file.replace(/\\/g, '/'),
  mode: '100644',
  type: 'blob',
  content: readFileSync(path.join(root, file), 'utf8'),
}));
if (deletePlaceholder) tree.push({ path: '.bootstrap', mode: '100644', type: 'blob', sha: null });

const createdTree = await json(
  await api('/git/trees', { method: 'POST', body: JSON.stringify(baseTree === null ? { tree } : { base_tree: baseTree, tree }) }),
);
const commit = await json(
  await api('/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message: MESSAGE, tree: createdTree.sha, parents: baseSha === null ? [] : [baseSha] }),
  }),
);
if (baseSha === null) {
  await json(await api('/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: commit.sha }) }));
} else {
  await json(await api(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: true }) }));
}

console.log(JSON.stringify({ repo: `${OWNER}/${REPO}`, commit: commit.sha, files: files.length }, null, 2));
