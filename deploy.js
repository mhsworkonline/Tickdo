#!/usr/bin/env node
// Pushes the code to GitHub. Usage: node deploy.js ["commit message"]
const { execSync } = require('node:child_process');

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const message = process.argv[2] || `Update ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

run('git add -A');
try {
  run(`git commit -m ${JSON.stringify(message)}`);
} catch {
  console.log('Nothing new to commit.');
}
run('git push -u origin main');
