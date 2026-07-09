#!/usr/bin/env node
/**
 * Deploy a versioned Storybook build to the gh-pages branch.
 *
 * Usage:
 *   node scripts/deploy-storybook.mjs v0.0.3
 *
 * Required env var:
 *   GITHUB_REPOSITORY  "owner/repo"  (set automatically in GitHub Actions)
 *
 * Optional env vars:
 *   GIT_USER_EMAIL  (default: github-actions[bot]@users.noreply.github.com)
 *   GIT_USER_NAME   (default: github-actions[bot])
 *
 * What it does:
 *   1. Builds Storybook (relative asset paths — works from any subdirectory).
 *   2. Checks out the gh-pages branch into a git worktree (creates it if absent).
 *   3. Copies the build into  gh-pages/<version>/  and  gh-pages/latest/.
 *   4. Writes/updates  gh-pages/versions.json  (newest version first).
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

// ── Validate inputs ───────────────────────────────────────────────────────────

const version = process.argv[2];
if (!version || !/^v\d+\.\d+\.\d+/.test(version)) {
  console.error('Usage: node scripts/deploy-storybook.mjs v<major>.<minor>.<patch>');
  console.error('Example: node scripts/deploy-storybook.mjs v0.0.3');
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
const GIT_EMAIL =
  process.env.GIT_USER_EMAIL ?? 'github-actions[bot]@users.noreply.github.com';
const GIT_NAME = process.env.GIT_USER_NAME ?? 'github-actions[bot]';

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

// ── 3. Copy build to versioned and latest folders ─────────────────────────────

console.log(`\n── 3/5  Copying build to ${version}/ and latest/ ────────────────`);

for (const dir of [version, 'latest']) {
  const dest = join(WORKTREE, dir);
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true });
  }
  cpSync(STORYBOOK_OUT, dest, { recursive: true });
}

// ── 4. Update versions.json ───────────────────────────────────────────────────

console.log('\n── 4/5  Updating versions.json ──────────────────────────────────');

const versionsFile = join(WORKTREE, 'versions.json');
let versions = [];
if (existsSync(versionsFile)) {
  try {
    versions = JSON.parse(readFileSync(versionsFile, 'utf-8'));
  } catch {
    versions = [];
  }
}

// Prepend newest version, deduplicate, keep newest-first.
versions = [version, ...versions.filter((v) => v !== version)];
writeFileSync(versionsFile, JSON.stringify(versions, null, 2) + '\n');

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
  run(`git commit -m "docs: deploy Storybook ${version}"`, { cwd: WORKTREE });
  run('git push origin gh-pages', { cwd: WORKTREE });
  console.log(`\n✓  ${version}/ → https://${owner}.github.io/${repoName}/${version}/`);
  console.log(`✓  latest/  → https://${owner}.github.io/${repoName}/latest/`);
} else {
  console.log(`No changes detected — ${version} is already deployed. Skipping commit.`);
}

// Cleanup
run(`git worktree remove "${WORKTREE}"`);
