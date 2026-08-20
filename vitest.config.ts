import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Since we are testing server code
    include: ['tests/**/*.test.ts'],
    env: {
      DATABASE_URL: 'file:./data/database.db',
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
});
