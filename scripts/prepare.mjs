/* global console, process */

import { spawnSync } from 'node:child_process';

const isCi =
  process.env.CI === 'true' || process.env.VERCEL === '1' || process.env.RENDER === 'true';

if (isCi) {
  process.exit(0);
}

const result = spawnSync('npx', ['husky'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error?.code === 'ENOENT') {
  console.warn('husky is not available; skipping git hook setup');
  process.exit(0);
}

process.exit(result.status ?? 0);
