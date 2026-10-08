#!/usr/bin/env node
/**
 * Start an Android emulator and install Tickdo on it.
 *
 * Usage:
 *   node runonemulator.js              STANDALONE app (default): everything is inside the APK, so you
 *                                      just tap the Tickdo icon. No laptop server needed afterwards.
 *   node runonemulator.js --dev        DEVELOPMENT app with live reload. Keep this terminal open;
 *                                      the app loads its code from your laptop (Metro).
 *   node runonemulator.js --dev --fast reuse the installed development app, just start Metro
 *   node runonemulator.js --avd NAME   use a specific emulator (default: first one found)
 *   node runonemulator.js --cold       cold-boot the emulator (fixes a stuck emulator)
 *
 * The first build takes a long time (Gradle downloads the NDK, CMake and dependencies; the
 * standalone build also optimises the app). Later builds are incremental and much faster.
 * Switching between --dev and standalone reinstalls the app; your test data on the
 * emulator is kept unless the signatures differ (then the old app is removed first).
 */
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const APP_ID = 'in.tickdo.app';
const BOOT_TIMEOUT_MS = 4 * 60 * 1000;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const DEV = flag('--dev');

function log(msg) {
  console.log(`\x1b[36m[tickdo]\x1b[0m ${msg}`);
}

function fail(msg) {
  console.error(`\x1b[31m[tickdo] ${msg}\x1b[0m`);
  process.exit(1);
}

function findSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    'C:\\Android\\Sdk',
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
    path.join(os.homedir(), 'Library', 'Android', 'sdk'),
    path.join(os.homedir(), 'Android', 'Sdk'),
  ].filter(Boolean);
  return candidates.find((dir) => fs.existsSync(path.join(dir, 'platform-tools')));
}

const sdk = findSdk();
if (!sdk) {
  fail('Android SDK not found. Set ANDROID_HOME to your SDK folder (the one containing platform-tools).');
}

const exe = process.platform === 'win32' ? '.exe' : '';
const adb = path.join(sdk, 'platform-tools', `adb${exe}`);
const emulator = path.join(sdk, 'emulator', `emulator${exe}`);

// Make Gradle, Expo CLI and every child process use this SDK and its adb
// (other adb copies on PATH, e.g. from scrcpy, can fight over the adb server).
const env = {
  ...process.env,
  ANDROID_HOME: sdk,
  ANDROID_SDK_ROOT: sdk,
  PATH: [path.join(sdk, 'platform-tools'), path.join(sdk, 'emulator'), process.env.PATH].join(path.delimiter),
};

function run(cmd, cmdArgs) {
  const res = spawnSync(cmd, cmdArgs, { env, encoding: 'utf8' });
  return (res.stdout || '').trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function checkJava() {
  const res = spawnSync('java', ['-version'], { env, encoding: 'utf8' });
  if (res.error) {
    fail('Java not found. Install a JDK (17 or 21) and set JAVA_HOME.');
  }
  const version = (res.stderr || res.stdout).split('\n')[0];
  log(`Java: ${version}`);
}

function runningEmulators() {
  return run(adb, ['devices'])
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && serial.startsWith('emulator-') && state === 'device')
    .map(([serial]) => serial);
}

function pickAvd() {
  const avds = run(emulator, ['-list-avds'])
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('INFO'));
  if (avds.length === 0) {
    fail('No emulators found. Create one in Android Studio > Device Manager.');
  }
  const wanted = option('--avd');
  if (wanted) {
    if (!avds.includes(wanted)) fail(`Emulator "${wanted}" not found. Available: ${avds.join(', ')}`);
    return wanted;
  }
  return avds[0];
}

async function bootEmulator() {
  const already = runningEmulators();
  if (already.length > 0) {
    log(`Emulator already running (${already[0]}).`);
    return already[0];
  }

  const avd = pickAvd();
  log(`Starting emulator "${avd}"...`);
  const emuArgs = ['-avd', avd, '-netdelay', 'none', '-netspeed', 'full'];
  if (flag('--cold')) emuArgs.push('-no-snapshot-load');
  const child = spawn(emulator, emuArgs, { env, detached: true, stdio: 'ignore' });
  child.unref();

  const started = Date.now();
  while (Date.now() - started < BOOT_TIMEOUT_MS) {
    const [serial] = runningEmulators();
    if (serial && run(adb, ['-s', serial, 'shell', 'getprop', 'sys.boot_completed']) === '1') {
      log(`Emulator booted (${serial}).`);
      // Keep the screen awake while developing.
      run(adb, ['-s', serial, 'shell', 'svc', 'power', 'stayon', 'true']);
      return serial;
    }
    await sleep(3000);
  }
  fail('Emulator did not finish booting within 4 minutes. Try again with --cold.');
}

function isInstalled(serial) {
  return run(adb, ['-s', serial, 'shell', 'pm', 'list', 'packages', APP_ID]).includes(`package:${APP_ID}`);
}

function expo(expoArgs, onExit) {
  log(`npx expo ${expoArgs.join(' ')}`);
  // shell: true is required on Windows to launch npx (.cmd) from Node.
  const child = spawn('npx', ['expo', ...expoArgs], { env, stdio: 'inherit', shell: true, cwd: __dirname });
  child.on('exit', (code) => (onExit ? onExit(code ?? 0) : process.exit(code ?? 0)));
}

async function main() {
  checkJava();
  const serial = await bootEmulator();
  // Expo CLI selects devices by name; for an emulator that is its AVD name.
  const avdName = run(adb, ['-s', serial, 'emu', 'avd', 'name']).split(/\r?\n/)[0].trim();
  const device = avdName ? ['--device', avdName] : [];

  if (!DEV) {
    log('Building the standalone app (first time takes a while)...');
    expo(['run:android', '--variant', 'release', '--no-bundler', ...device], (code) => {
      if (code === 0) {
        run(adb, ['-s', serial, 'shell', 'monkey', '-p', APP_ID, '-c', 'android.intent.category.LAUNCHER', '1']);
        log('Done. Tickdo is installed. Open it from the app drawer any time; no laptop server needed.');
      }
      process.exit(code);
    });
    return;
  }

  // Development mode: the app loads JS from Metro on this laptop via localhost:8081.
  run(adb, ['-s', serial, 'reverse', 'tcp:8081', 'tcp:8081']);
  if (flag('--fast') && isInstalled(serial)) {
    expo(['start', '--dev-client', '--android']);
    return;
  }
  log('Building and installing the development app (first time takes several minutes)...');
  expo(['run:android', ...device]);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
