import IQuillCursorsOptions from './i-quill-cursors-options';
import Cursor from './cursor';
import IQuillRange from './i-range';
import * as RangeFix from 'rangefix';
import template from './template';
import ResizeObserver from 'resize-observer-polyfill';
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
  private _currentSelection: IQuillRange;
  private _isObserving = false;

  public constructor(quill: any, options: IQuillCursorsOptions = {}) {
    this.quill = quill;
    this.options = this._setDefaults(options);
    this._container = this.quill.addContainer(this.options.containerClass);
    this._boundsContainer = this.options.boundsContainer || this.quill.container;
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
    this.quill.off(
      this.quill.constructor.events.TEXT_CHANGE,
      this._handleTextChangeBinded,
    );

    this.quill.off(
      this.quill.constructor.events.SELECTION_CHANGE,
      this._setSelectionBinded,
    );

    this.quill.root.removeEventListener('scroll', this._updateBinded);
  }

  private _registerSelectionChangeListeners(): void {
    this.quill.on(
      this.quill.constructor.events.SELECTION_CHANGE,
      this._setSelectionBinded,
    );
  }

  private _registerTextChangeListener(): void {
    this.quill.on(
      this.quill.constructor.events.TEXT_CHANGE,
      this._handleTextChangeBinded,
    );
  }

  private _registerDomListeners(): void {
    this.quill.root.addEventListener('scroll', this._updateBinded);
  }

  private _registerResizeObserver(): void {
    if (this._isObserving) return;

    const resizeObserver = new ResizeObserver(([entry]: ResizeObserverEntry[]) => {
      if (!entry.target.isConnected) {
        resizeObserver.disconnect();
        this._isObserving = false;
      }
      this.update();
    });

    resizeObserver.observe(this.quill.root);
    this._isObserving = true;
  }

  private _updateCursor(cursor: Cursor): void {
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

    const endBounds = this.quill.getBounds(endIndex);
    cursor.updateCaret(endBounds, containerRectangle);

    const ranges = this._lineRanges(cursor, startLeaf, endLeaf);
    const selectionRectangles = ranges
      .reduce((rectangles, range) => rectangles.concat(Array.from(RangeFix.getClientRects(range))), []);

    cursor.updateSelection(selectionRectangles, containerRectangle);
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

  private _handleTextChangeBinded = (delta: any): void => {
    // Wrap in a timeout to give the text change an opportunity to finish
    // before checking for the current selection
    window.setTimeout(() => {
      if (this.options.transformOnTextChange) {
        this._transformCursors(delta);
      }

      if (this.options.selectionChangeSource) {
        this._emitSelection();
        this.update();
      }
    });
  };

  private _setSelectionBinded = (selection: IQuillRange): void => {
    this._currentSelection = selection;
  };

  private _updateBinded = (): void => {
    this.update();
  };

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

  // Rather than just use the start leaf and end leaf directly to build a single range,
  // we instead find all the lines in that single range and create a sub-range for each
  // of these lines. This avoids the browser creating a range around an entire paragraph
  // element, and instead forces the browser to draw rectangles around the paragraph's
  // constituent text nodes, which is more consistent with the existing browser selection
  // behaviour.
  private _lineRanges(cursor: Cursor, startLeaf: any[], endLeaf: any[]): Range[] {
    const lines = this.quill.getLines(cursor.range);
    return lines.reduce((ranges: Range[], line: any, index: number) => {
      if (!line.children) {
        const singleElementRange = document.createRange();
        singleElementRange.selectNode(line.domNode);
        return ranges.concat(singleElementRange);
      }

      const [rangeStart, startOffset] = index === 0 ?
        startLeaf :
        line.path(0).pop();

      const [rangeEnd, endOffset] = index === lines.length - 1 ?
        endLeaf :
        line.path(line.length() - 1).pop();

      const range = document.createRange();

      if (rangeStart.domNode.nodeType === Node.TEXT_NODE) {
        range.setStart(rangeStart.domNode, startOffset);
      } else {
        range.setStartBefore(rangeStart.domNode);
      }

      if (rangeEnd.domNode.nodeType === Node.TEXT_NODE) {
        range.setEnd(rangeEnd.domNode, endOffset);
      } else {
        range.setEndAfter(rangeEnd.domNode);
      }

      return ranges.concat(range);
    }, []);
  }

  private _transformCursors(delta: any): void {
    delta = new Delta(delta);

    this.cursors()
      .filter((cursor: Cursor) => cursor.range)
      .forEach((cursor: Cursor) => {
        cursor.range.index = delta.transformPosition(cursor.range.index);
        this._updateCursor(cursor);
      });
  }
}
