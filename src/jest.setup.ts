// jsdom does not implement the CSS Custom Highlight API, constructable
// stylesheets, adoptedStyleSheets or ResizeObserver. These minimal stand-ins
// let the unit tests exercise the code paths that use them.

class HighlightStub {
  public readonly ranges = new Set<unknown>();
  public priority = 0;

  public constructor(...ranges: unknown[]) {
    ranges.forEach((range) => this.ranges.add(range));
  }

  public get size(): number {
    return this.ranges.size;
  }

  public add(range: unknown): HighlightStub {
    this.ranges.add(range);
    return this;
  }

  public delete(range: unknown): boolean {
    return this.ranges.delete(range);
  }

  public has(range: unknown): boolean {
    return this.ranges.has(range);
  }

  public clear(): void {
    this.ranges.clear();
  }
}

class CSSStyleSheetStub {
  public cssText = '';

  public replaceSync(text: string): void {
    this.cssText = text;
  }
}

class ResizeObserverStub {
  public observe(): void {
    // no-op
  }

  public unobserve(): void {
    // no-op
  }

  public disconnect(): void {
    // no-op
  }
}

(globalThis as any).Highlight = HighlightStub;
(globalThis as any).CSS = Object.assign((globalThis as any).CSS ?? {}, {highlights: new Map()});
(globalThis as any).CSSStyleSheet = CSSStyleSheetStub;
(globalThis as any).ResizeObserver = ResizeObserverStub;

[Document.prototype, ShadowRoot.prototype].forEach((proto) => {
  Object.defineProperty(proto, 'adoptedStyleSheets', {
    configurable: true,
    writable: true,
    value: [],
  });
});

beforeEach(() => {
  (CSS as any).highlights.clear();
  (document as any).adoptedStyleSheets = [];
});
