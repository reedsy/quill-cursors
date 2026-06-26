let nextHighlightNumber = 0;

export default class CursorHighlight {
  public static readonly NAME_PREFIX = 'ql-cursor-highlight';
  public static readonly SELECTION_ALPHA = '30%';

  private static _hasWarnedUnsupported = false;

  public static isSupported(): boolean {
    return typeof Highlight !== 'undefined' &&
      typeof CSS !== 'undefined' &&
      !!CSS.highlights;
  }

  public static warnIfUnsupported(): void {
    if (CursorHighlight.isSupported() || CursorHighlight._hasWarnedUnsupported) return;
    CursorHighlight._hasWarnedUnsupported = true;
    console.warn(
      'quill-cursors: This browser does not support the CSS Custom Highlight API. ' +
      'Cursor carets and flags will work, but selection ranges will not be shown. ' +
      'See https://github.com/reedsy/quill-cursors#browser-support',
    );
  }

  // The color is interpolated into a stylesheet, where (unlike an inline
  // style property assignment) a malicious string could escape the
  // declaration and inject arbitrary document-level CSS. Validating it as a
  // standalone color value prevents any breakout, while still allowing
  // custom properties like var(--user-color).
  private static _safeColor(color: string): string {
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return color;
    return CSS.supports('background-color', color) ? color : 'transparent';
  }

  // Another copy of this module on the same page (e.g. duplicated bundles)
  // shares the page-global registry but not this counter — skip taken names.
  private static _nextName(): string {
    let name = `${ CursorHighlight.NAME_PREFIX }-${ nextHighlightNumber++ }`;
    while (typeof CSS !== 'undefined' && CSS.highlights && CSS.highlights.has(name)) {
      name = `${ CursorHighlight.NAME_PREFIX }-${ nextHighlightNumber++ }`;
    }
    return name;
  }

  public readonly name: string;

  private readonly _color: string;
  private _highlight: Highlight | null = null;
  private _sheet: CSSStyleSheet | null = null;
  private _root: Document | ShadowRoot | null = null;

  public constructor(color: string) {
    this._color = CursorHighlight._safeColor(color);
    this.name = CursorHighlight._nextName();
  }

  public setRange(range: Range | null, root: Node): void {
    if (!CursorHighlight.isSupported()) return;

    this._attach(root);
    this._highlight.clear();
    if (range) {
      this._highlight.add(range);
    }
  }

  public clear(): void {
    if (!this._highlight) return;
    this._highlight.clear();
  }

  public detach(): void {
    if (this._highlight) {
      CSS.highlights.delete(this.name);
      this._highlight = null;
    }

    if (this._root) {
      this._removeSheetFrom(this._root);
      this._root = null;
    }
  }

  private _attach(root: Node): void {
    if (!this._highlight) {
      this._highlight = new Highlight();
      CSS.highlights.set(this.name, this._highlight);
    }

    this._adoptSheetInto(this._styleRoot(root));
  }

  private _adoptSheetInto(root: Document | ShadowRoot | null): void {
    if (!root || root === this._root) return;

    if (this._root) {
      // The editor has moved to a different document or shadow root
      this._removeSheetFrom(this._root);
    }

    if (!this._sheet) {
      this._sheet = this._buildSheet();
    }

    root.adoptedStyleSheets = [...root.adoptedStyleSheets, this._sheet];
    this._root = root;
  }

  private _removeSheetFrom(root: Document | ShadowRoot): void {
    root.adoptedStyleSheets = root.adoptedStyleSheets
      .filter((sheet: CSSStyleSheet) => sheet !== this._sheet);
  }

  private _buildSheet(): CSSStyleSheet {
    const sheet = new CSSStyleSheet();
    const background = `color-mix(in srgb, ${ this._color } ${ CursorHighlight.SELECTION_ALPHA }, transparent)`;
    sheet.replaceSync(`::highlight(${ this.name }) { background-color: ${ background }; }`);
    return sheet;
  }

  // Note: instanceof is realm-sensitive by design. A root from another realm
  // (e.g. an editor inside an iframe while this library runs in the parent)
  // is deliberately not matched: constructable stylesheets cannot be adopted
  // across realms (the assignment throws), so foreign-realm roots degrade to
  // carets-only rendering instead of crashing.
  private _styleRoot(node: Node): Document | ShadowRoot | null {
    if (node instanceof Document || node instanceof ShadowRoot) {
      return node;
    }
    return null;
  }
}
