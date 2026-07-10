#!/usr/bin/env node
/**
 * Deploy a full Storybook snapshot as a preview build to the gh-pages branch.
 *
 * Usage:
 *   node scripts/deploy-storybook.mjs
 *   node scripts/deploy-storybook.mjs preview-003
 *
 * Required env var:
 *   GITHUB_REPOSITORY  "owner/repo"  (set automatically in GitHub Actions)
 *
 * Optional env vars:
 *   GITHUB_SHA       current commit SHA (set automatically in GitHub Actions)
 *   GITHUB_TOKEN     token for GitHub API PR lookup (set in workflow)
 *   GIT_USER_EMAIL  (default: github-actions[bot]@users.noreply.github.com)
 *   GIT_USER_NAME   (default: github-actions[bot])
 *   CHANGED_PACKAGES_JSON JSON array from changesets output
 *
 * What it does:
 *   1. Builds Storybook (relative asset paths — works from any subdirectory).
 *   2. Checks out the gh-pages branch into a git worktree (creates it if absent).
 *   3. Copies the build into gh-pages/previews/<preview-id>/ and gh-pages/latest/.
 *   4. Writes/updates gh-pages/preview-builds.json (newest build first).
 *   5. Commits and pushes.
 *   6. Removes the worktree.
 */

import { execSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const PREVIEW_ID_RE = /^preview-\d{3}$/;

// ── Validate inputs ───────────────────────────────────────────────────────────

const requestedPreviewId = process.argv[2];
if (requestedPreviewId && !PREVIEW_ID_RE.test(requestedPreviewId)) {
  console.error('Usage: node scripts/deploy-storybook.mjs [preview-###]');
  console.error('Example: node scripts/deploy-storybook.mjs preview-003');
  process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY;
if (!repo || !repo.includes('/')) {
  console.error('Error: GITHUB_REPOSITORY env var must be set to "owner/repo".');
  process.exit(1);
}

// ── Config ────────────────────────────────────────────────────────────────────

const [owner, repoName] = repo.split('/');
const ROOT = resolve(process.cwd());
const STORYBOOK_OUT = join(ROOT, 'storybook-static');
const WORKTREE = join(ROOT, '.gh-pages-worktree');
const PREVIEWS_DIR = 'previews';
const PREVIEW_BUILDS_FILE = 'preview-builds.json';
const GIT_EMAIL =
  process.env.GIT_USER_EMAIL ?? 'github-actions[bot]@users.noreply.github.com';
const GIT_NAME = process.env.GIT_USER_NAME ?? 'github-actions[bot]';
const CURRENT_SHA = process.env.GITHUB_SHA ?? capture('git rev-parse HEAD', { cwd: ROOT });
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

/** @typedef {{name: string, version: string}} ChangedPackage */
/** @typedef {{number?: number, title: string, url: string}} SourcePullRequest */
/** @typedef {{previewId: string, url: string, deployedAt: string, deployedCommitSha: string, changedPackages: ChangedPackage[], sourcePullRequest: SourcePullRequest}} PreviewBuild */

/** Run a command, stream output to stdout/stderr, and throw on failure. */
function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

/** Run a command and return its trimmed stdout (throws on failure). */
function capture(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...opts,
  }).trim();
}

/** Parse changesets output JSON and return valid changed package entries. */
function getChangedPackages() {
  const raw = process.env.CHANGED_PACKAGES_JSON;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({ name: item?.name, version: item?.version }))
      .filter((item) => typeof item.name === 'string' && typeof item.version === 'string');
  } catch {
    return [];
  }
}

/** Convert package name like @scope/fec-table to monorepo path packages/fec/table. */
function packageNameToPath(pkgName) {
  const parts = pkgName.split('/');
  if (parts.length !== 2) return null;

  const packageSlug = parts[1];
  const slugParts = packageSlug.split('-');
  if (slugParts.length < 2) return null;

  const area = slugParts[0];
  const component = slugParts.slice(1).join('-');
  return `packages/${area}/${component}/`;
}

/** Build a deterministic next preview id from existing metadata. */
function getNextPreviewId(builds) {
  let max = 0;
  for (const build of builds) {
    const match = /^preview-(\d{3})$/.exec(build?.previewId ?? '');
    if (!match) continue;
    max = Math.max(max, Number(match[1]));
  }
  return `preview-${String(max + 1).padStart(3, '0')}`;
}

/** Read preview-builds metadata from gh-pages worktree. */
function readPreviewBuilds(worktreePath) {
  const metadataFile = join(worktreePath, PREVIEW_BUILDS_FILE);
  if (!existsSync(metadataFile)) return [];

  try {
    const parsed = JSON.parse(readFileSync(metadataFile, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Heuristic to ignore changesets release PRs in source PR attribution. */
function isVersionPackagesPr(pr) {
  const title = String(pr?.title ?? '').toLowerCase();
  const headRef = String(pr?.head?.ref ?? '').toLowerCase();
  return (
    title === 'version packages' ||
    title.startsWith('version packages') ||
    headRef.includes('changeset-release')
  );
}

/** GitHub REST helper with token auth. */
async function githubRequest(path, { accept } = {}) {
  if (!GITHUB_TOKEN) return null;

  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: accept ?? 'application/vnd.github+json',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'storybook-preview-deployer',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) return null;
  return response.json();
}

/** Get commit SHAs between previous and current deployment touching changed package paths. */
function getRelevantCommitShas(previousSha, currentSha, packagePaths) {
  if (!previousSha || !currentSha || !packagePaths.length) return [];

  try {
    const raw = capture(`git log --name-only --pretty=format:%H ${previousSha}..${currentSha}`, {
      cwd: ROOT,
    });

    const lines = raw.split('\n');
    const relevant = [];
    let currentCommit = '';
    let touchedRelevantPath = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        if (currentCommit && touchedRelevantPath) {
          relevant.push(currentCommit);
        }
        currentCommit = '';
        touchedRelevantPath = false;
        continue;
      }

      if (/^[a-f0-9]{40}$/i.test(trimmed)) {
        if (currentCommit && touchedRelevantPath) {
          relevant.push(currentCommit);
        }
        currentCommit = trimmed;
        touchedRelevantPath = false;
        continue;
      }

      if (packagePaths.some((pkgPath) => trimmed.startsWith(pkgPath))) {
        touchedRelevantPath = true;
      }
    }

    if (currentCommit && touchedRelevantPath) {
      relevant.push(currentCommit);
    }

    return relevant;
  } catch {
    return [];
  }
}

/** Resolve the most recent merged feature PR tied to changed package commits. */
async function resolveSourcePullRequest({ previousSha, currentSha, changedPackages }) {
  const packagePaths = changedPackages
    .map((pkg) => packageNameToPath(pkg.name))
    .filter((path) => Boolean(path));

  const commitShas = getRelevantCommitShas(previousSha, currentSha, packagePaths);

  for (const sha of commitShas) {
    const pulls = await githubRequest(
      `/repos/${owner}/${repoName}/commits/${sha}/pulls`,
      { accept: 'application/vnd.github+json' },
    );

    if (!Array.isArray(pulls) || pulls.length === 0) continue;

    const candidate = pulls.find((pr) => pr?.merged_at && !isVersionPackagesPr(pr));
    if (candidate) {
      return {
        number: candidate.number,
        title: candidate.title,
        url: candidate.html_url,
      };
    }
  }

  return {
    title: `Commit ${currentSha.slice(0, 7)}`,
    url: `https://github.com/${owner}/${repoName}/commit/${currentSha}`,
  };
}

// ── 1. Build Storybook ────────────────────────────────────────────────────────

console.log('\n── 1/5  Building Storybook ──────────────────────────────────────');
// The Storybook build already produces relative ./  asset paths
// (verified from the existing storybook-static/ output), so the same
// compiled output can be placed in any versioned subdirectory and work.
run('pnpm build-storybook --output-dir storybook-static', { cwd: ROOT });

// ── 2. Set up gh-pages worktree ───────────────────────────────────────────────

console.log('\n── 2/5  Setting up gh-pages worktree ────────────────────────────');

// Remove any leftover worktree from a previous failed run.
if (existsSync(WORKTREE)) {
  try {
    run(`git worktree remove --force "${WORKTREE}"`);
  } catch {
    rmSync(WORKTREE, { recursive: true, force: true });
    run(`git worktree prune`);
  }
}

// Check whether gh-pages already exists on the remote.
let remoteHasBranch = false;
try {
  capture('git ls-remote --exit-code origin gh-pages');
  remoteHasBranch = true;
} catch {
  remoteHasBranch = false;
}

if (remoteHasBranch) {
  // Sync the local ref and add a worktree that tracks it.
  run('git fetch origin gh-pages:refs/heads/gh-pages');
  run(`git worktree add "${WORKTREE}" gh-pages`);
} else {
  console.log('gh-pages branch does not exist on remote — creating orphan branch.');
  // --orphan requires Git ≥ 2.41 (ubuntu-latest ships Git ≥ 2.43).
  run(`git worktree add --orphan -b gh-pages "${WORKTREE}"`);

  // Seed the redirect root page (only needed once on first deploy).
  writeFileSync(
    join(WORKTREE, 'index.html'),
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url=latest/" />
  <title>Redirecting…</title>
</head>
<body>Redirecting to <a href="latest/">latest</a>…</body>
</html>
`,
  );
}

// Always ensure .nojekyll is present at the gh-pages root.
// Without this file GitHub Pages runs Jekyll on the site, which silently
// drops files/folders whose names start with _ (e.g. Storybook's sb-addons/)
// and causes blank pages — exactly the issue the original
// `touch storybook-static/.nojekyll` was fixing.
writeFileSync(join(WORKTREE, '.nojekyll'), '');

const existingPreviewBuilds = readPreviewBuilds(WORKTREE);
const previewId = requestedPreviewId ?? getNextPreviewId(existingPreviewBuilds);
const changedPackages = getChangedPackages();
const previousDeployedSha = existingPreviewBuilds[0]?.deployedCommitSha;
const sourcePullRequest = await resolveSourcePullRequest({
  previousSha: previousDeployedSha,
  currentSha: CURRENT_SHA,
  changedPackages,
});

// ── 3. Copy build to preview and latest folders ───────────────────────────────

console.log(`\n── 3/5  Copying build to ${PREVIEWS_DIR}/${previewId}/ and latest/ ──`);

for (const dest of [join(WORKTREE, PREVIEWS_DIR, previewId), join(WORKTREE, 'latest')]) {
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true });
  }
  cpSync(STORYBOOK_OUT, dest, { recursive: true });
}

// ── 4. Update preview-builds.json ─────────────────────────────────────────────

console.log('\n── 4/5  Updating preview-builds.json ────────────────────────────');

const previewBuildsFile = join(WORKTREE, PREVIEW_BUILDS_FILE);

/** @type {PreviewBuild} */
const nextEntry = {
  previewId,
  url: `/previews/${previewId}/`,
  deployedAt: new Date().toISOString(),
  deployedCommitSha: CURRENT_SHA,
  changedPackages,
  sourcePullRequest,
};

// Prepend newest preview build, deduplicate by previewId, keep newest-first.
const previewBuilds = [
  nextEntry,
  ...existingPreviewBuilds.filter((entry) => entry?.previewId !== previewId),
];
writeFileSync(previewBuildsFile, JSON.stringify(previewBuilds, null, 2) + '\n');

// ── 5. Commit and push ────────────────────────────────────────────────────────

console.log('\n── 5/5  Committing and pushing ──────────────────────────────────');

run(`git config user.email "${GIT_EMAIL}"`, { cwd: WORKTREE });
run(`git config user.name "${GIT_NAME}"`, { cwd: WORKTREE });
run('git add -A', { cwd: WORKTREE });

// Avoid empty commits when re-deploying the same version.
let hasChanges = false;
try {
  capture('git diff --cached --exit-code', { cwd: WORKTREE });
} catch {
  hasChanges = true;
}

if (hasChanges) {
  run(`git commit -m "docs: deploy Storybook preview build ${previewId}"`, { cwd: WORKTREE });
  run('git push origin gh-pages', { cwd: WORKTREE });
  console.log(`\n✓  previews/${previewId}/ → https://${owner}.github.io/${repoName}/previews/${previewId}/`);
  console.log(`✓  latest/  → https://${owner}.github.io/${repoName}/latest/`);
} else {
  console.log(`No changes detected — preview build ${previewId} is already deployed. Skipping commit.`);
}

// Cleanup
run(`git worktree remove "${WORKTREE}"`);
