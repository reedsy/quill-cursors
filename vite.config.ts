import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'QuillCursors',
      formats: ['es', 'umd'],
      fileName: (format) => `quill-cursors.${format}.js`,
    },
    rollupOptions: {
      external: ['quill'],
      output: { globals: { quill: 'Quill' } },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    coverage: { provider: 'v8' },
  },
});
