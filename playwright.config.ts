import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000, // 2 min per test (LLM calls are slow)
  retries: 0,
  use: {
    baseURL: 'https://legalhelp.cl',
  },
});
