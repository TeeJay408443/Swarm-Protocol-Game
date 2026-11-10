/**
 * Playwright Configuration
 * Phase 9: Test & Deploy - E2E Testing Setup
 */

import { defineConfig, devices } from '@playwright/test'

// Get test URL from environment or use localhost
const testUrl = process.env.TEST_URL || 'http://localhost:3000'

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail build on CI if tests fail
  forbidOnly: !!process.env.CI,
  
  // Retry tests on CI
  retries: process.env.CI ? 2 : 0,
  
  // Workers for parallel testing
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results.json' }],
    ['html', { outputFolder: 'playwright-report' }]
  ],
  
  // Use configuration
  use: {
    // Trace on first retry
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Base URL
    baseURL: testUrl,
    
    // Timeout
    timeout: 30000,
    
    // Navigation timeout
    navigationTimeout: 30000,
    
    // Action timeout
    actionTimeout: 10000
  },
  
  // Projects for cross-browser testing
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad'] },
    }
  ],
  
  // Global setup (optional)
  globalSetup: './tests/global-setup.ts',
  
  // Global teardown (optional)
  globalTeardown: './tests/global-teardown.ts'
})
