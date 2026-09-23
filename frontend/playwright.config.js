import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: [
    { command: 'node ../backend/server.js', url: 'http://localhost:4000/api/health', reuseExistingServer: true, timeout: 120_000 },
    { command: 'npm run dev', url: 'http://localhost:3000/admin/login', reuseExistingServer: true, timeout: 120_000 }
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
