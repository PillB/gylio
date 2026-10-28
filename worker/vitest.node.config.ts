import { defineConfig } from 'vitest/config';

// Plain Node tests: config, headers file, security.txt and docs checks that need the file system, not workerd.
export default defineConfig({ test: { include: ['test/node/**/*.test.ts'], environment: 'node' } });
