import IQuillCursorsOptions from './i-quill-cursors-options';
import Cursor from './cursor';
import IQuillRange from './i-range';
import CursorHighlight from './cursor-highlight';
import template from './template';
import Delta = require('quill-delta');

export default class QuillCursors {
  public static DEFAULTS: IQuillCursorsOptions = {
    template,
    containerClass: 'ql-cursors',
    selectionChangeSource: 'api',
    hideDelayMs: 3000,
    hideSpeedMs: 400,
  };

  public readonly quill: any;
  public readonly options: IQuillCursorsOptions;

  private readonly _cursors: { [id: string]: Cursor } = {};
  private readonly _container: HTMLElement;
  private readonly _boundsContainer: HTMLElement;
  private readonly _editor: HTMLElement;
  private _currentSelection: IQuillRange;
  private _isObserving = false;
  private _destroyed = false;
  private _resizeObserver: ResizeObserver | null = null;
  private _touchTimerIds: ReturnType<typeof setTimeout>[] = [];
  private _quillListeners: Array<{ event: string; wrapped: (...args: any[]) => void }> = [];
  private _domListeners: Array<{target: HTMLElement; event: string; wrapped: EventListener}> = [];

  public constructor(quill: any, options: IQuillCursorsOptions = {}) {
    CursorHighlight.warnIfUnsupported();
    this.quill = quill;
    this.options = this._setDefaults(options);
    this._container = this.quill.addContainer(this.options.containerClass);
    this._boundsContainer = this.options.boundsContainer || this.quill.container;
    this._editor = this.quill.root;
    this._currentSelection = this.quill.getSelection();

    this._registerSelectionChangeListeners();
    this._registerTextChangeListener();
    this._registerDomListeners();
  }

  public createCursor(id: string, name: string, color: string): Cursor {
    let cursor = this._cursors[id];

    if (!cursor) {
      cursor = new Cursor(id, name, color);
      this._cursors[id] = cursor;
      const element = cursor.build(this.options);
      this._container.appendChild(element);
    }

    return cursor;
  }

  public moveCursor(id: string, range: IQuillRange): void {
    const cursor = this._cursors[id];
    if (!cursor) {
      return;
    }

    cursor.range = range;
    this._updateCursor(cursor);
  }

  public removeCursor(id: string): void {
    const cursor = this._cursors[id];
    if (!cursor) {
      return;
    }

    cursor.remove();
    delete this._cursors[id];
  }

  public update(): void {
    this.cursors().forEach((cursor: Cursor) => this._updateCursor(cursor));
  }

  public clearCursors(): void {
    this.cursors().forEach((cursor: Cursor) => this.removeCursor(cursor.id));
  }

  public toggleFlag(id: string, shouldShow?: boolean): void {
    const cursor = this._cursors[id];
    if (!cursor) {
      return;
    }

    cursor.toggleFlag(shouldShow);
  }

  public cursors(): Cursor[] {
    return Object.keys(this._cursors)
      .map((key) => this._cursors[key]);
  }

  public destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.clearCursors();
    this._touchTimerIds.forEach((id) => clearTimeout(id));
    this._touchTimerIds = [];
    this._quillListeners.forEach(({event, wrapped}) => this.quill.off(event, wrapped));
    this._quillListeners = [];
    this._domListeners.forEach(({target, event, wrapped}) => target.removeEventListener(event, wrapped));
    this._domListeners = [];
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._isObserving = false;
    this._container.parentNode?.removeChild(this._container);
  }

  private readonly _onScroll = (): void => {
    this._repositionCursors();
  };

  // Highlights are repainted natively by the browser on scroll/resize; only
  // the absolutely-positioned elements (carets, flags and block-embed
  // overlays) go stale. Skipping the range rebuild also avoids needless
  // highlight repaints. Trade-off: if a cursor was hidden by a SILENT content
  // change (no text-change event), this path re-shows its caret but its
  // selection stays unpainted until the next full update — preferable to v4,
  // which re-revealed stale, mispositioned rects.
  private _repositionCursors(): void {
    this.cursors().forEach((cursor: Cursor) => this._updateCursor(cursor, true));
  }

  private readonly _handleCursorTouch = (e: MouseEvent): void => {
    this.cursors().forEach((cursor) => {
      cursor.toggleNearCursor(e.pageX, e.pageY);
      const timerId = setTimeout(() => {
        const index = this._touchTimerIds.indexOf(timerId);
        if (index !== -1) this._touchTimerIds.splice(index, 1);
        cursor.toggleFlag(false);
      }, this.options.hideDelayMs);
      this._touchTimerIds.push(timerId);
    });
  };

  private _addQuillListener(event: string, handler: (...args: any[]) => void): void {
    const wrapped = (...args: any[]): void => {
      if (this.quill.constructor.find(this.quill.container)) {
        handler(...args);
        return;
      }
      this.destroy();
    };
    this.quill.on(event, wrapped);
    this._quillListeners.push({event, wrapped});
  }

  private _addDomListener(
    target: HTMLElement,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ): void {
    const wrapped: EventListener = (...args: Parameters<EventListener>): void => {
      if (this.quill.constructor.find(this.quill.container)) {
        handler(...args);
        return;
      }
      this.destroy();
    };
    target.addEventListener(event, wrapped, options);
    this._domListeners.push({target, event, wrapped});
  }

  private _registerSelectionChangeListeners(): void {
    this._addQuillListener(
      this.quill.constructor.events.SELECTION_CHANGE,
      (selection: IQuillRange) => {
        this._currentSelection = selection;
      },
    );
  }

  private _registerTextChangeListener(): void {
    this._addQuillListener(
      this.quill.constructor.events.TEXT_CHANGE,
      (delta: Delta) => {
        this._handleTextChange(delta);
      },
    );
  }

  private _registerDomListeners(): void {
    this._addDomListener(this._editor, 'scroll', this._onScroll, {passive: true});
    this._addDomListener(this._editor, 'touchstart', this._handleCursorTouch as EventListener, {passive: true});
  }

  private _registerResizeObserver(): void {
    if (this._destroyed || this._isObserving) return;
    const editor = this._editor;

    this._resizeObserver = new ResizeObserver(([entry]: ResizeObserverEntry[]) => {
      if (!entry.target.isConnected) {
        if (this._resizeObserver) {
          this._resizeObserver.disconnect();
          this._resizeObserver = null;
        }
        this._isObserving = false;
        return;
      }
      this._repositionCursors();
    });

    this._resizeObserver.observe(editor);
    this._isObserving = true;
  }

  private _updateCursor(cursor: Cursor, positionsOnly = false): void {
    this._registerResizeObserver();

    if (!cursor.range) {
      return cursor.hide();
    }

    const startIndex = this._indexWithinQuillBounds(cursor.range.index);
    const endIndex = this._indexWithinQuillBounds(cursor.range.index + cursor.range.length);

    const startLeaf = this.quill.getLeaf(startIndex);
    const endLeaf = this.quill.getLeaf(endIndex);

    if (!this._leafIsValid(startLeaf) || !this._leafIsValid(endLeaf)) {
      return cursor.hide();
    }

    cursor.show();

    const containerRectangle = this._boundsContainer.getBoundingClientRect();

    let endBounds = this.quill.getBounds(endIndex);
    const isRtl = this._isRtl(endLeaf[0].domNode.parentElement);
    if (isRtl) {
      endBounds = this._adjustBoundsForRtl(endBounds, endLeaf);
    }
    cursor.updateCaret(endBounds, containerRectangle);
    cursor.updateEmbedSelections(this._embedRectangles(cursor), containerRectangle);

    if (positionsOnly) {
      return;
    }

    cursor.setSelectionRange(this._selectionRange(cursor, startLeaf, endLeaf));
  }

  // Quill's getBounds() returns width:0 for cursor positions, losing the
  // character width needed to compute the correct RTL caret position.
  // This method computes the correct position directly from the DOM.
  private _adjustBoundsForRtl(bounds: any, leaf: any[]): any {
    const node = leaf[0].domNode;
    const offset = leaf[1];

    if (!(node instanceof Text) || node.data.length === 0) {
      return bounds;
    }

    const charRect = this._getCharacterRectAtCursor(node, offset);
    const containerRect = this.quill.container.getBoundingClientRect();

    // For RTL: at start/middle positions, cursor goes at right edge of character;
    // at end of text node, cursor goes at left edge of last character.
    const caretX = offset < node.data.length ? charRect.right : charRect.left;

    return {
      ...bounds,
      left: caretX - containerRect.left,
    };
  }

  private _getCharacterRectAtCursor(node: Text, offset: number): DOMRect {
    const range = document.createRange();
    if (offset < node.data.length) {
      range.setStart(node, offset);
      range.setEnd(node, offset + 1);
    } else {
      range.setStart(node, offset - 1);
      range.setEnd(node, offset);
    }
    return range.getBoundingClientRect();
  }

  private _isRtl(element: Element | null): boolean {
    if (!element) return false;
    return window.getComputedStyle(element).direction === 'rtl';
  }

  private _indexWithinQuillBounds(index: number): number {
    const quillLength = this.quill.getLength();
    const maxQuillIndex = quillLength ? quillLength - 1 : 0;
    index = Math.max(index, 0);
    index = Math.min(index, maxQuillIndex);
    return index;
  }

  private _leafIsValid(leaf: any): boolean {
    return leaf && leaf[0] && leaf[0].domNode && leaf[1] >= 0;
  }

  private _handleTextChange(delta: Delta): void {
    // Wrap in a timeout to give the text change an opportunity to finish
    // before checking for the current selection
    window.setTimeout(() => {
      if (this._destroyed) return;
      if (this.options.transformOnTextChange) {
        this._transformCursors(delta);
      }

      if (this.options.selectionChangeSource) {
        this._emitSelection();
        this.update();
      }
    });
  }

  private _emitSelection(): void {
    this.quill.emitter.emit(
      this.quill.constructor.events.SELECTION_CHANGE,
      this.quill.getSelection(),
      this._currentSelection,
      this.options.selectionChangeSource,
    );
  }

  private _setDefaults(options: IQuillCursorsOptions): IQuillCursorsOptions {
    options = Object.assign({}, options);

    options.template ||= QuillCursors.DEFAULTS.template;
    options.containerClass ||= QuillCursors.DEFAULTS.containerClass;

    if (options.selectionChangeSource !== null) {
      options.selectionChangeSource ||= QuillCursors.DEFAULTS.selectionChangeSource;
    }

    options.hideDelayMs = Number.isInteger(options.hideDelayMs) ?
      options.hideDelayMs :
      QuillCursors.DEFAULTS.hideDelayMs;

    options.hideSpeedMs = Number.isInteger(options.hideSpeedMs) ?
      options.hideSpeedMs :
      QuillCursors.DEFAULTS.hideSpeedMs;

    options.transformOnTextChange = !!options.transformOnTextChange;

    return options;
  }

  // Builds a single DOM Range spanning the cursor's selection. The CSS Custom
  // Highlight API paints a multi-line range exactly like a native selection,
  // so no per-line splitting or rectangle computation is needed.
  private _selectionRange(cursor: Cursor, startLeaf: any[], endLeaf: any[]): Range | null {
    if (!cursor.range.length) {
      return null;
    }

    const range = document.createRange();
    const [startBlot, startOffset] = startLeaf;
    const [endBlot, endOffset] = endLeaf;

    if (startBlot.domNode.nodeType === Node.TEXT_NODE) {
      range.setStart(startBlot.domNode, startOffset);
    } else {
      range.setStartBefore(startBlot.domNode);
    }

    if (endBlot.domNode.nodeType === Node.TEXT_NODE) {
      range.setEnd(endBlot.domNode, endOffset);
    } else {
      range.setEndAfter(endBlot.domNode);
    }

    return range.collapsed ? null : range;
  }

  // Block embeds (lines without children, e.g. video) are not painted by the
  // Highlight API, so they get tinted overlay rectangles instead. Inline
  // embeds are skipped, matching native selection painting.
  private _embedRectangles(cursor: Cursor): ClientRect[] {
    if (!cursor.range.length) {
      return [];
    }

    const lines = this.quill.getLines(cursor.range);
    return lines
      .filter((line: any) => !line.children)
      .map((line: any) => line.domNode.getBoundingClientRect());
  }

  private _transformCursors(delta: Delta): void {
    delta = new Delta(delta);

    this.cursors()
      .filter((cursor: Cursor) => cursor.range)
      .forEach((cursor: Cursor) => {
        cursor.range.index = delta.transformPosition(cursor.range.index);
        this._updateCursor(cursor);
      });
  }
}
