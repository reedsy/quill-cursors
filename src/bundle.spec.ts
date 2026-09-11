import {execFileSync} from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {pathToFileURL} from 'url';

interface IBundleReport {
  exportNames: string[];
  defaultType: string;
  defaults: string[];
  cursorClass: string | undefined;
  injectedStyles: number;
}

const root = path.resolve(__dirname, '..');

// Evaluates a built bundle with the real Node ESM loader. Each bundle gets its
// own process, so the style injection of one cannot leak into another's report.
function inspectBundle(file: string): IBundleReport {
  const script = `
    import {createRequire} from 'node:module';
    const {JSDOM} = createRequire(${JSON.stringify(pathToFileURL(`${root}/`).href)})('jsdom');
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    const bundle = await import(${JSON.stringify(pathToFileURL(file).href)});
    console.log(JSON.stringify({
      exportNames: Object.keys(bundle).sort(),
      defaultType: typeof bundle.default,
      defaults: Object.keys(bundle.default?.DEFAULTS ?? {}),
      cursorClass: bundle.Cursor?.CURSOR_CLASS,
      injectedStyles: [...document.querySelectorAll('style')]
        .filter((style) => style.textContent.includes('ql-cursor')).length,
    }));
  `;
  const stdout = execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: root,
    encoding: 'utf8',
  });
  return JSON.parse(stdout);
}

describe('built bundles', () => {
  let outputPath: string;
  let full: IBundleReport;
  let core: IBundleReport;

  beforeAll(() => {
    outputPath = fs.mkdtempSync(path.join(os.tmpdir(), 'quill-cursors-dist-'));
    execFileSync(process.execPath, [require.resolve('webpack-cli/bin/cli.js'), '--output-path', outputPath], {
      cwd: root,
      env: {...process.env, NODE_ENV: 'production'},
    });
    full = inspectBundle(path.join(outputPath, 'quill-cursors.js'));
    core = inspectBundle(path.join(outputPath, 'quill-cursors.core.js'));
  }, 60000);

  afterAll(() => {
    fs.rmSync(outputPath, {recursive: true, force: true});
  });

  it('export QuillCursors as default and Cursor as a named export', () => {
    for (const report of [full, core]) {
      expect(report.exportNames).toEqual(['Cursor', 'default']);
      expect(report.defaultType).toBe('function');
      expect(report.defaults).toEqual([
        'template',
        'containerClass',
        'selectionChangeSource',
        'hideDelayMs',
        'hideSpeedMs',
      ]);
      expect(report.cursorClass).toBe('ql-cursor');
    }
  });

  it('inject the stylesheet from the full bundle only', () => {
    expect(full.injectedStyles).toBe(1);
    expect(core.injectedStyles).toBe(0);
  });
});
