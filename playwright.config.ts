import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.TEST_FRONTEND_PORT || 5173);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, channel: 'chrome', trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: { command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: !process.env.CI },
});
