import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        setupFiles: ['./tests/env.ts', './tests/db.ts'],
        fileParallelism: false,
    },
});
