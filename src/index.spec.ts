import * as fs from 'fs';
import * as path from 'path';
import * as index from './index.js';
import QuillCursors from './quill-cursors/quill-cursors.js';
import Cursor from './quill-cursors/cursor.js';

describe('index', () => {
  it('should export QuillCursors as default', () => {
    expect(index.default).toBe(QuillCursors);
  });

  it('should export Cursor as a named export', () => {
    expect(index.Cursor).toBe(Cursor);
  });

  it('should NOT import any .scss or .css files', () => {
    const specPath = expect.getState().testPath!;
    const source = fs.readFileSync(
      path.resolve(path.dirname(specPath), 'index.ts'),
      'utf-8',
    );
    expect(source).not.toMatch(/\.scss/);
    expect(source).not.toMatch(/\.css/);
  });
});
