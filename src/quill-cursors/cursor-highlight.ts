import ICursorHighlight from './i-cursor-highlight';

let nextHighlightNumber = 0;

// Only constructed when isSupported(); methods assume the Highlight API
// globals exist.
export default class CursorHighlight implements ICursorHighlight {
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
    return CSS.supports('background-color', color) ? color : 'transparent';
  }

  // Another copy of this module on the same page (e.g. duplicated bundles)
  // shares the page-global registry but not this counter, so skip taken numbers.
  private static _nextNumber(): number {
    let number = nextHighlightNumber++;
    while (CSS.highlights.has(`${ CursorHighlight.NAME_PREFIX }-${ number }`)) {
      number = nextHighlightNumber++;
    }
    return number;
  }

  public readonly name: string;

  private readonly _color: string;
  private readonly _priority: number;
  private _highlight: Highlight | null = null;
  private _sheet: CSSStyleSheet | null = null;
  private _root: Document | ShadowRoot | null = null;

  public constructor(color: string) {
    this._color = CursorHighlight._safeColor(color);
    this._priority = CursorHighlight._nextNumber();
    this.name = `${ CursorHighlight.NAME_PREFIX }-${ this._priority }`;
  }

  // The root is passed per call: the cursor element has no root until it is
  // attached to the DOM after build().
  public setRange(range: Range | null, root: Node): void {
    this._attach(root);
    this.clear();
    if (range) {
      this._highlight.add(range);
    }
  }

  public clear(): void {
    if (!this._highlight) return;
    this._highlight.clear();
  }

  public detach(): void {
    CSS.highlights.delete(this.name);
    this._highlight = null;
    this._removeSheet();
  }

  private _attach(root: Node): void {
    if (!this._highlight) {
      this._highlight = new Highlight();
      // Later-created cursors paint on top when selections overlap. Priority
      // is fixed at creation: it cannot track document position, which
      // changes with every edit.
      this._highlight.priority = this._priority;
      CSS.highlights.set(this.name, this._highlight);
    }

    this._adoptSheetInto(this._styleRoot(root));
  }

  private _adoptSheetInto(root: Document | ShadowRoot | null): void {
    if (!root || root === this._root) return;

    // The editor has moved to a different document or shadow root
    this._removeSheet();

    if (!this._sheet) {
      this._sheet = this._buildSheet();
    }

    root.adoptedStyleSheets.push(this._sheet);
    this._root = root;
  }

  private _removeSheet(): void {
    if (!this._root) return;

    const sheets = this._root.adoptedStyleSheets;
    const index = sheets.indexOf(this._sheet);
    if (index >= 0) {
      sheets.splice(index, 1);
    }
    this._root = null;
  }

  private _buildSheet(): CSSStyleSheet {
    const sheet = new CSSStyleSheet();
    const background = `color-mix(in srgb, ${ this._color } ${ CursorHighlight.SELECTION_ALPHA }, transparent)`;
    sheet.replaceSync(`::highlight(${ this.name }) { background-color: ${ background }; }`);
    return sheet;
  }

  // instanceof is realm-sensitive by design: constructable stylesheets cannot
  // be adopted across realms (the assignment throws), so a root from another
  // realm (e.g. an iframe) degrades to carets-only rendering instead of
  // crashing.
  private _styleRoot(node: Node): Document | ShadowRoot | null {
    if (node instanceof Document || node instanceof ShadowRoot) {
      return node;
    }
    return null;
  }
}
