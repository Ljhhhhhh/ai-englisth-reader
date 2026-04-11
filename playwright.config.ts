import { defineConfig, devices } from '@playwright/test';

function getNonEmptyEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

const baseURL = getNonEmptyEnv('PLAYWRIGHT_BASE_URL') ?? 'http://127.0.0.1:3000';
const webServerCommand =
  getNonEmptyEnv('PLAYWRIGHT_WEB_SERVER_COMMAND') ??
  "sh -lc 'env FILE_BACKED_ARTICLES=1 pnpm exec next dev --hostname 127.0.0.1 --port 3000'";
const shouldStartWebServer =
  process.env.PLAYWRIGHT_SKIP_WEB_SERVER !== '1' &&
  !getNonEmptyEnv('PLAYWRIGHT_BASE_URL');

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL,
    trace: 'on-first-retry',
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
