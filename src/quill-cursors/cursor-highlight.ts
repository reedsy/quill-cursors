import ICursorHighlight from './i-cursor-highlight';

let nextHighlightNumber = 0;

// Only constructed when isSupported(); methods assume the Highlight API
// globals exist.
export default class CursorHighlight implements ICursorHighlight {
  public static readonly NAME_PREFIX = 'ql-cursor-highlight';
  // Single source of truth for the fade lives in the stylesheet, which also
  // uses it for the embed overlay opacity; the fallback covers setups that
  // load the core bundle without the stylesheet.
  public static readonly SELECTION_FADE = 'var(--ql-cursor-selection-fade, 0.3)';

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
    // Register eagerly: this reserves the name in the page-global registry,
    // so another module copy probing _nextNumber cannot take the same one.
    this._register();
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

  // Hiding disables the stylesheet instead of dropping the ranges, so
  // becoming visible again does not need a selection update.
  public setVisible(visible: boolean): void {
    if (!this._sheet) return;
    this._sheet.disabled = !visible;
  }

  public detach(): void {
    CSS.highlights.delete(this.name);
    this._highlight = null;
    if (this._sheet) {
      this._sheet.disabled = false;
    }
    this._removeSheet();
  }

  private _register(): void {
    this._highlight = new Highlight();
    // Later-created cursors paint on top when selections overlap. Priority
    // is fixed at creation: it cannot track document position, which
    // changes with every edit.
    this._highlight.priority = this._priority;
    CSS.highlights.set(this.name, this._highlight);
  }

  private _attach(root: Node): void {
    if (!this._highlight) {
      // Re-attach after detach()
      this._register();
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
    const fade = `calc(${ CursorHighlight.SELECTION_FADE } * 100%)`;
    const background = `color-mix(in srgb, ${ this._color } ${ fade }, transparent)`;
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
