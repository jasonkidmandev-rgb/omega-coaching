import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to store authentication state
const authFile = path.join(__dirname, '.playwright/.auth/admin.json');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['list'],
  ],
  
  // Global test settings
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  
  // Visual regression settings
  expect: {
    toHaveScreenshot: {
      // Allow 1% pixel difference for anti-aliasing variations
      maxDiffPixelRatio: 0.01,
      // Threshold for color difference (0-1)
      threshold: 0.2,
      // Animation handling
      animations: 'disabled',
    },
    toMatchSnapshot: {
      // Threshold for text/data snapshots
      threshold: 0.2,
    },
  },
  
  // Output directories
  outputDir: '.playwright/test-results',
  snapshotDir: '.playwright/snapshots',
  
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    
    // Anonymous tests (no authentication required)
    {
      name: 'anonymous',
      testMatch: /\/(auth|navigation)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Authenticated tests (requires login)
    {
      name: 'authenticated',
      testMatch: /\/admin-.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
    },
    
    // Visual regression tests
    {
      name: 'visual',
      testMatch: /\/visual-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Consistent viewport for visual tests
        viewport: { width: 1280, height: 720 },
      },
    },
    
    // Mobile viewport tests
    {
      name: 'mobile',
      testMatch: /\/(auth|navigation)\.spec\.ts/,
      use: { ...devices['iPhone 13'] },
    },
  ],
  
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
