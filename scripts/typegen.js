#!/usr/bin/env node
/**
 * Generates Expo Router typed-route definitions (.expo/types/router.d.ts) without starting
 * the dev server, so `npm run typecheck` works on a clean checkout and in CI.
 */
const path = require('node:path');

const cliRoot = path.dirname(require.resolve('@expo/cli/package.json', { paths: [require.resolve('expo/package.json')] }));
const { startTypescriptTypeGenerationAsync } = require(
  path.join(cliRoot, 'build/src/start/server/type-generation/startTypescriptTypeGeneration.js'),
);

startTypescriptTypeGenerationAsync({ projectRoot: path.resolve(__dirname, '..'), metro: null, server: null })
  .then(() => console.log('typed routes generated'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
