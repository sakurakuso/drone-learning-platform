import { defineConfig } from 'vitest/config';

// Release checkouts live under work/. Run this application's tests once.
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
