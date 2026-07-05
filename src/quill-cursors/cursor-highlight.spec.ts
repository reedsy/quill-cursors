import CursorHighlight from './cursor-highlight';

describe('CursorHighlight', () => {
  beforeEach(() => {
    (CursorHighlight as any)._hasWarnedUnsupported = false;
  });

  describe('isSupported', () => {
    it('returns true when the Highlight API is available', () => {
      expect(CursorHighlight.isSupported()).toBe(true);
    });

    it('returns false without the Highlight constructor', () => {
      withoutGlobal('Highlight', () => {
        expect(CursorHighlight.isSupported()).toBe(false);
      });
    });

    it('returns false without the CSS global', () => {
      withoutGlobal('CSS', () => {
        expect(CursorHighlight.isSupported()).toBe(false);
      });
    });

    it('returns false without CSS.highlights', () => {
      const css = (globalThis as any).CSS;
      (globalThis as any).CSS = {};
      try {
        expect(CursorHighlight.isSupported()).toBe(false);
      } finally {
        (globalThis as any).CSS = css;
      }
    });
  });

  describe('name', () => {
    it('allocates a unique name per highlight', () => {
      const first = new CursorHighlight('red');
      const second = new CursorHighlight('red');

      expect(first.name).toMatch(/^ql-cursor-highlight-\d+$/);
      expect(second.name).toMatch(/^ql-cursor-highlight-\d+$/);
      expect(first.name).not.toBe(second.name);
    });

    it('skips names already taken in the registry', () => {
      const current = new CursorHighlight('red');
      const nextNumber = Number(current.name.split('-').pop()) + 1;
      const takenName = `${ CursorHighlight.NAME_PREFIX }-${ nextNumber }`;
      (CSS as any).highlights.set(takenName, new Highlight());

      const next = new CursorHighlight('red');

      expect(next.name).not.toBe(takenName);
      expect(next.name).toMatch(/^ql-cursor-highlight-\d+$/);
    });
  });

  describe('priority', () => {
    it('paints later-created highlights above earlier ones', () => {
      const first = new CursorHighlight('red');
      const second = new CursorHighlight('blue');
      first.setRange(document.createRange(), document);
      second.setRange(document.createRange(), document);

      const earlier: any = (CSS as any).highlights.get(first.name);
      const later: any = (CSS as any).highlights.get(second.name);
      expect(later.priority).toBeGreaterThan(earlier.priority);
    });
  });

  describe('color sanitisation', () => {
    let originalSupports: any;

    beforeEach(() => {
      originalSupports = (CSS as any).supports;
    });

    afterEach(() => {
      (CSS as any).supports = originalSupports;
    });

    it('keeps colors that pass CSS.supports validation', () => {
      (CSS as any).supports = jest.fn().mockReturnValue(true);
      const highlight = new CursorHighlight('var(--user-color)');

      highlight.setRange(document.createRange(), document);

      expect((CSS as any).supports).toHaveBeenCalledWith('background-color', 'var(--user-color)');
      expect((document as any).adoptedStyleSheets[0].cssText)
        .toContain('color-mix(in srgb, var(--user-color) 30%, transparent)');
    });

    it('replaces colors that fail validation with transparent', () => {
      (CSS as any).supports = jest.fn().mockReturnValue(false);
      const highlight = new CursorHighlight('red; } * { background: red; }');

      highlight.setRange(document.createRange(), document);

      expect((document as any).adoptedStyleSheets[0].cssText).toBe(
        `::highlight(${ highlight.name }) ` +
        '{ background-color: color-mix(in srgb, transparent 30%, transparent); }',
      );
    });

  });

  describe('setRange', () => {
    it('registers the highlight and adds the range', () => {
      const highlight = new CursorHighlight('red');
      const range = document.createRange();

      highlight.setRange(range, document);

      const registered: any = (CSS as any).highlights.get(highlight.name);
      expect(registered.has(range)).toBe(true);
      expect(registered.size).toBe(1);
    });

    it('replaces any previous range', () => {
      const highlight = new CursorHighlight('red');
      const firstRange = document.createRange();
      const secondRange = document.createRange();

      highlight.setRange(firstRange, document);
      highlight.setRange(secondRange, document);

      const registered: any = (CSS as any).highlights.get(highlight.name);
      expect(registered.has(firstRange)).toBe(false);
      expect(registered.has(secondRange)).toBe(true);
    });

    it('empties the highlight when passed null', () => {
      const highlight = new CursorHighlight('red');
      highlight.setRange(document.createRange(), document);

      highlight.setRange(null, document);

      const registered: any = (CSS as any).highlights.get(highlight.name);
      expect(registered.size).toBe(0);
    });

    it('adopts a stylesheet fading the cursor color to 30%', () => {
      const highlight = new CursorHighlight('red');

      highlight.setRange(document.createRange(), document);

      const sheets: any[] = (document as any).adoptedStyleSheets;
      expect(sheets).toHaveLength(1);
      expect(sheets[0].cssText)
        .toBe(`::highlight(${ highlight.name }) { background-color: color-mix(in srgb, red 30%, transparent); }`);
    });

    it('adopts the stylesheet only once', () => {
      const highlight = new CursorHighlight('red');

      highlight.setRange(document.createRange(), document);
      highlight.setRange(document.createRange(), document);

      expect((document as any).adoptedStyleSheets).toHaveLength(1);
    });

    it('adopts the stylesheet into a shadow root', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const shadowRoot = host.attachShadow({mode: 'open'});
      (shadowRoot as any).adoptedStyleSheets = [];
      const highlight = new CursorHighlight('red');

      highlight.setRange(document.createRange(), shadowRoot);

      expect((shadowRoot as any).adoptedStyleSheets).toHaveLength(1);
      expect((document as any).adoptedStyleSheets).toHaveLength(0);
      document.body.removeChild(host);
    });

    it('moves the stylesheet when the root changes', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const shadowRoot = host.attachShadow({mode: 'open'});
      (shadowRoot as any).adoptedStyleSheets = [];
      const highlight = new CursorHighlight('red');

      highlight.setRange(document.createRange(), document);
      highlight.setRange(document.createRange(), shadowRoot);

      expect((document as any).adoptedStyleSheets).toHaveLength(0);
      expect((shadowRoot as any).adoptedStyleSheets).toHaveLength(1);
      document.body.removeChild(host);
    });

    it('still registers the highlight for elements outside a document', () => {
      const highlight = new CursorHighlight('red');
      const detached = document.createElement('div');

      highlight.setRange(document.createRange(), detached.getRootNode());

      expect((CSS as any).highlights.has(highlight.name)).toBe(true);
      expect((document as any).adoptedStyleSheets).toHaveLength(0);
    });

    it('re-registers after detach when setRange is called again', () => {
      const highlight = new CursorHighlight('red');
      highlight.setRange(document.createRange(), document);
      highlight.detach();

      highlight.setRange(document.createRange(), document);

      expect((CSS as any).highlights.has(highlight.name)).toBe(true);
      expect((document as any).adoptedStyleSheets).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('empties the ranges without unregistering the highlight', () => {
      const highlight = new CursorHighlight('red');
      highlight.setRange(document.createRange(), document);

      highlight.clear();

      const registered: any = (CSS as any).highlights.get(highlight.name);
      expect(registered.size).toBe(0);
      expect((CSS as any).highlights.has(highlight.name)).toBe(true);
    });

    it('is safe to call before any range is set', () => {
      const highlight = new CursorHighlight('red');
      expect(() => highlight.clear()).not.toThrow();
    });
  });

  describe('detach', () => {
    it('unregisters the highlight and removes the stylesheet', () => {
      const highlight = new CursorHighlight('red');
      highlight.setRange(document.createRange(), document);

      highlight.detach();

      expect((CSS as any).highlights.has(highlight.name)).toBe(false);
      expect((document as any).adoptedStyleSheets).toHaveLength(0);
    });

    it('is safe to call before attaching', () => {
      const highlight = new CursorHighlight('red');
      expect(() => highlight.detach()).not.toThrow();
    });

    it('only removes its own stylesheet', () => {
      const first = new CursorHighlight('red');
      const second = new CursorHighlight('blue');
      first.setRange(document.createRange(), document);
      second.setRange(document.createRange(), document);

      first.detach();

      const sheets: any[] = (document as any).adoptedStyleSheets;
      expect(sheets).toHaveLength(1);
      expect(sheets[0].cssText).toContain(second.name);
    });

    it('tolerates a stylesheet already removed by external code', () => {
      const highlight = new CursorHighlight('red');
      highlight.setRange(document.createRange(), document);
      (document as any).adoptedStyleSheets = [];

      expect(() => highlight.detach()).not.toThrow();
    });
  });

  describe('warnIfUnsupported', () => {
    it('does not warn when the API is supported', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation();
      CursorHighlight.warnIfUnsupported();
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('warns exactly once when the API is unsupported', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation();
      withoutGlobal('Highlight', () => {
        CursorHighlight.warnIfUnsupported();
        CursorHighlight.warnIfUnsupported();
      });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('CSS Custom Highlight API');
      warn.mockRestore();
    });
  });

  function withoutGlobal(name: string, callback: () => void): void {
    const original = (globalThis as any)[name];
    delete (globalThis as any)[name];
    try {
      callback();
    } finally {
      (globalThis as any)[name] = original;
    }
  }
});
