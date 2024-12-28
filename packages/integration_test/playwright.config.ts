import { defineConfig, devices, expect } from '@playwright/test'
import { configureToMatchImageSnapshot } from '@ayroblu/playwright-image-snapshot'

const toMatchImageSnapshot = configureToMatchImageSnapshot({
  failureThreshold: 0.01,
})

expect.extend({ toMatchImageSnapshot })

export default defineConfig({
  testDir: './test',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    headless: false,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  expect: {
    // Maximum time expect() should wait for the condition to be met.
    timeout: 50000,

    toHaveScreenshot: {
      // An acceptable amount of pixels that could be different, unset by default.
      maxDiffPixels: 10,
    },

    toMatchSnapshot: {
      // An acceptable ratio of pixels that are different to the
      // total amount of pixels, between 0 and 1.
      maxDiffPixelRatio: 0.1,
    },
  },
})
