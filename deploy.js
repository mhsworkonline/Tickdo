#!/usr/bin/env node
/**
 * Commit everything and push Tickdo to GitHub.
 *
 *   node deploy.js                      commit with an auto message, then push
 *   node deploy.js "your message"       commit with your message, then push
 *   node deploy.js --no-verify-tests    skip `npm run verify` (not recommended)
 *
 * What it does, in order:
 *   1. makes sure this folder is a git repo on branch "main"
 *   2. runs `npm run verify` (typecheck, lint, tests) so broken code is not pushed
 *   3. refuses to continue if a likely secret is about to be committed
 *   4. stages everything not ignored, commits (if there is anything to commit)
 *   5. points "origin" at the GitHub repo and pushes
 *
 * Authentication uses whatever git already has on this machine (Git Credential Manager
 * on Windows, or the GitHub CLI if installed). On the first push a browser window may open
 * to sign in to GitHub once.
 */
const { spawnSync } = require('node:child_process');

const REPO_URL = 'https://github.com/mhsworkonline/Tickdo.git';
const BRANCH = 'main';
const CO_AUTHOR = 'Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>';

const args = process.argv.slice(2);
const skipTests = args.includes('--no-verify-tests');
const customMessage = args.find((a) => !a.startsWith('--'));

const c = { cyan: '\x1b[36m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', off: '\x1b[0m' };
const log = (m) => console.log(`${c.cyan}[deploy]${c.off} ${m}`);
const die = (m) => {
  console.error(`${c.red}[deploy] ${m}${c.off}`);
  process.exit(1);
};

function git(gitArgs, opts = {}) {
  const res = spawnSync('git', gitArgs, { encoding: 'utf8', cwd: __dirname, ...opts });
  return { ok: res.status === 0, out: (res.stdout || '').trim(), err: (res.stderr || '').trim(), status: res.status };
}

// 1. Repo and branch
if (!git(['--version']).ok) die('Git is not installed.');
if (!git(['rev-parse', '--is-inside-work-tree']).ok) {
  log('Not a git repository yet. Initialising...');
  if (!git(['init', '-b', BRANCH]).ok) die('git init failed.');
}
const current = git(['branch', '--show-current']).out;
if (current !== BRANCH) {
  log(`Switching branch "${current || '(none)'}" -> ${BRANCH}`);
  const r = git(['checkout', '-B', BRANCH]);
  if (!r.ok) die(`Could not switch to ${BRANCH}: ${r.err}`);
}

// 2. Tests
if (skipTests) {
  log(`${c.yellow}Skipping tests (--no-verify-tests).${c.off}`);
} else {
  log('Running npm run verify (typecheck, lint, tests)...');
  const res = spawnSync('npm', ['run', 'verify'], { cwd: __dirname, stdio: 'inherit', shell: true });
  if (res.status !== 0) die('Checks failed, nothing was pushed. Fix the errors above, or use --no-verify-tests to override.');
}

// 3. Stage and scan for secrets
git(['add', '-A']);
const staged = git(['diff', '--cached', '--name-only']).out.split('\n').filter(Boolean);

const SECRET_FILES = /(^|\/)\.env($|\.(?!example$))|\.(jks|keystore|p8|p12|pem|key)$|google-services\.json$|GoogleService-Info\.plist$|service-account.*\.json$|(^|\/)credentials\.json$/i;
const SECRET_CONTENT = /(sk_live_[0-9a-zA-Z]{10,}|sk-[A-Za-z0-9]{32,}|AIza[0-9A-Za-z_-]{35}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\bgoog_[A-Za-z0-9]{20,}|\bappl_[A-Za-z0-9]{20,}|eyJhbGciOi[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,})/;

const problems = [];
for (const file of staged) {
  if (SECRET_FILES.test(file)) problems.push(`${file}  (sensitive file name)`);
}
const added = git(['diff', '--cached', '-U0', '--no-color', '--', '.', ':(exclude)package-lock.json']).out.split('\n');
let currentFile = '';
for (const line of added) {
  if (line.startsWith('+++ b/')) currentFile = line.slice(6);
  else if (line.startsWith('+') && !line.startsWith('+++') && SECRET_CONTENT.test(line)) problems.push(`${currentFile}  (looks like a key or token)`);
}
if (problems.length > 0) {
  git(['reset', '-q']);
  die(`Possible secrets found, nothing was committed:\n  - ${[...new Set(problems)].join('\n  - ')}\nRemove them or add the files to .gitignore, then run again.`);
}

// 4. Commit
if (staged.length > 0) {
  const message =
    customMessage ||
    `Update Tickdo (${staged.length} file${staged.length === 1 ? '' : 's'} changed)\n\n${staged.slice(0, 15).map((f) => `- ${f}`).join('\n')}${staged.length > 15 ? `\n- ...and ${staged.length - 15} more` : ''}`;
  const r = git(['commit', '-q', '-m', `${message}\n\n${CO_AUTHOR}`]);
  if (!r.ok) die(`Commit failed: ${r.err || r.out}`);
  log(`Committed ${staged.length} file(s).`);
} else {
  log('Nothing new to commit.');
}
if (!git(['rev-parse', '--verify', 'HEAD']).ok) die('There are no commits to push.');

// 5. Remote and push
const remote = git(['remote', 'get-url', 'origin']);
if (!remote.ok) {
  log(`Adding remote origin -> ${REPO_URL}`);
  git(['remote', 'add', 'origin', REPO_URL]);
} else if (remote.out.replace(/\.git$/, '') !== REPO_URL.replace(/\.git$/, '')) {
  log(`Updating remote origin: ${remote.out} -> ${REPO_URL}`);
  git(['remote', 'set-url', 'origin', REPO_URL]);
}

log(`Pushing ${BRANCH} to GitHub...`);
let push = spawnSync('git', ['push', '-u', 'origin', BRANCH], { cwd: __dirname, stdio: 'inherit' });
if (push.status !== 0) {
  // The remote may already have commits (e.g. a README created on GitHub). Merge them in, never force.
  log('Push was rejected. Trying to merge the remote history (no force)...');
  const fetch = git(['fetch', 'origin', BRANCH]);
  if (fetch.ok) {
    const merge = git(['merge', '--allow-unrelated-histories', '--no-edit', `origin/${BRANCH}`]);
    if (!merge.ok) {
      git(['merge', '--abort']);
      die('The remote has different content that conflicts with yours. Resolve it manually; nothing was overwritten.');
    }
    push = spawnSync('git', ['push', '-u', 'origin', BRANCH], { cwd: __dirname, stdio: 'inherit' });
  }
}
if (push.status !== 0) die('Push failed. If GitHub asked you to sign in, finish that and run `node deploy.js` again.');

const hash = git(['rev-parse', '--short', 'HEAD']).out;
console.log(`\n${c.green}Pushed.${c.off}\n  Repository: ${REPO_URL.replace(/\.git$/, '')}\n  Branch:     ${BRANCH}\n  Commit:     ${hash}`);
