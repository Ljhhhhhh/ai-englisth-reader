import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const localNoProxy = '127.0.0.1,localhost';
process.env.NO_PROXY = process.env.NO_PROXY
  ? `${localNoProxy},${process.env.NO_PROXY}`
  : localNoProxy;
process.env.no_proxy = process.env.no_proxy
  ? `${localNoProxy},${process.env.no_proxy}`
  : localNoProxy;

function getNonEmptyEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

const playwrightPort = getNonEmptyEnv('PLAYWRIGHT_WEB_SERVER_PORT') ?? '3100';
const baseURL = getNonEmptyEnv('PLAYWRIGHT_BASE_URL') ?? `http://127.0.0.1:${playwrightPort}`;
const webServerPathPrefix = [path.dirname(process.execPath), getNonEmptyEnv('PNPM_HOME')]
  .filter((value): value is string => Boolean(value))
  .join(':');
const webServerCommand =
  getNonEmptyEnv('PLAYWRIGHT_WEB_SERVER_COMMAND') ??
  `sh -lc 'export PATH="${webServerPathPrefix}:$PATH"; env FILE_BACKED_ARTICLES=1 USE_FILE_ARTICLES=1 pnpm exec next dev --hostname 127.0.0.1 --port ${playwrightPort}'`;
const shouldStartWebServer =
  process.env.PLAYWRIGHT_SKIP_WEB_SERVER !== '1' &&
  !getNonEmptyEnv('PLAYWRIGHT_BASE_URL');

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: "USE_FILE_ARTICLES=1 pnpm exec next start --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
  webServer: shouldStartWebServer
    ? {
        command: webServerCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
