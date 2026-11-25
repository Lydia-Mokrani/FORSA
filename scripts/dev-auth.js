#!/usr/bin/env node
const { spawn } = require('child_process');

console.log('🚀 Démarrage conjoint de MS1 (Accounts & Shops) et MS5 (Notifications & Telegram Bot)...');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const ms1 = spawn(npmCmd, ['run', 'dev', '--workspace=services/ms1-accounts'], {
  stdio: 'inherit',
  shell: isWindows,
});

const ms5 = spawn(npmCmd, ['run', 'dev', '--workspace=services/ms5-notifications'], {
  stdio: 'inherit',
  shell: isWindows,
});

function handleExit(signal) {
  console.log(`\n🛑 Arrêt des services MS1 et MS5 (${signal})...`);
  ms1.kill();
  ms5.kill();
  process.exit(0);
}

process.on('SIGINT', () => handleExit('SIGINT'));
process.on('SIGTERM', () => handleExit('SIGTERM'));

ms1.on('close', (code) => {
  console.log(`[MS1] Processus terminé avec le code ${code}`);
});

ms5.on('close', (code) => {
  console.log(`[MS5] Processus terminé avec le code ${code}`);
});
