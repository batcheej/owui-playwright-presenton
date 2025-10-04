import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    // Remove baseURL since we connect to external services (Open WebUI and Presenton)
    trace: 'on-first-retry',
    // Increase timeouts for automation workflow
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional Chrome options for automation
        launchOptions: {
          args: ['--no-sandbox', '--disable-web-security'],
        },
      },
    },
  ],
  // Remove webServer since we connect to external Open WebUI and Presenton services
  timeout: 300000, // 5 minutes timeout for the full automation workflow
});