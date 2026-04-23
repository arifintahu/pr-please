import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'web-ext',
    environmentOptions: {
      'web-ext': {
        path: './dist',
        // Build once via the npm script before invoking vitest; disable the
        // per-worker compile so parallel workers don't race on `dist/`.
        compiler: false,
        playwright: {
          slowMo: 0,
        },
      },
    },
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // One fork so we launch a single Chromium with the extension loaded and
    // reuse it across the test files.
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    fileParallelism: false,
  },
});
