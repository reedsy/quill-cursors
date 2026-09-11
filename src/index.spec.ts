import * as fs from 'fs';
import * as path from 'path';

describe('index', () => {
  it('should export QuillCursors as default', () => {
    const index = require('./index');
    const QuillCursors = require('./quill-cursors/quill-cursors').default;
    expect(index.default).toBe(QuillCursors);
  });

  it('should export Cursor as a named export', () => {
    const index = require('./index');
    const Cursor = require('./quill-cursors/cursor').default;
    expect(index.Cursor).toBe(Cursor);
  });

  it('should NOT import any .scss or .css files', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, 'index.ts'),
      'utf-8',
    );
    expect(source).not.toMatch(/\.scss/);
    expect(source).not.toMatch(/\.css/);
  });
});
