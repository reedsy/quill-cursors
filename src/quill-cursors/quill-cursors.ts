import IQuillCursorsOptions from './i-quill-cursors-options';
import Cursor from './cursor';
import IQuillRange from './i-range';
import * as RangeFix from 'rangefix';
import template from './template';
import { ResizeObserver } from 'resize-observer';

export default class QuillCursors {
  private readonly _cursors: { [id: string]: Cursor } = {};
  private readonly _quill: any;
  private readonly _container: HTMLElement;
  private readonly _options: IQuillCursorsOptions;
  private _currentSelection: IQuillRange;

  public constructor(quill: any, options: IQuillCursorsOptions = {}) {
    this._quill = quill;
    this._options = this._setDefaults(options);
    this._container = this._quill.addContainer(this._options.containerClass);
    this._currentSelection = this._quill.getSelection();

    this._registerSelectionChangeListeners();
    this._registerTextChangeListener();
    this._registerDomListeners();
  }

  public createCursor(id: string, name: string, color: string): Cursor {
    let cursor = this._cursors[id];

    if (!cursor) {
      cursor = new Cursor(id, name, color);
      this._cursors[id] = cursor;
      const element = cursor.build(this._options);
      this._container.appendChild(element);
    }

    return cursor;
  }

  public moveCursor(id: string, range: IQuillRange) {
    const cursor = this._cursors[id];
    if (!cursor) {
      return;
    }

    cursor.range = range;
    this._updateCursor(cursor);
  }

  public removeCursor(id: string) {
    const cursor = this._cursors[id];
    if (!cursor) {
      return;
    }

    cursor.remove();
    delete this._cursors[id];
  }

  public update() {
    this.cursors().forEach((cursor: Cursor) => this._updateCursor(cursor));
  }

  public clearCursors() {
    this.cursors().forEach((cursor: Cursor) => this.removeCursor(cursor.id));
  }

  public cursors() {
    return Object.keys(this._cursors)
      .map(key => this._cursors[key]);
  }

  public flashCursor(id: string) {
    const cursor = this._cursors[id];
    if (cursor) {
      cursor.flash();
    }
  }

  private _registerSelectionChangeListeners() {
    this._quill.on(
      this._quill.constructor.events.SELECTION_CHANGE,
      (selection: IQuillRange) => {
        this._currentSelection = selection;
      }
    );
  }

  private _registerTextChangeListener() {
    if (!this._options.selectionChangeSource) {
      return;
    }

    this._quill.on(
      this._quill.constructor.events.TEXT_CHANGE,
      // Wrap in a timeout to give the text change an opportunity to finish
      // before checking for the current selection
      () => window.setTimeout(() => {
        this._emitSelection();
        this.update();
      })
    );
  }

  private _registerDomListeners() {
    const editor = this._quill.container.getElementsByClassName('ql-editor')[0];
    editor.addEventListener('scroll', () => this.update());
    const resizeObserver = new ResizeObserver(() => this.update());
    resizeObserver.observe(editor);
  }

  private _updateCursor(cursor: Cursor) {
    if (!cursor.range) {
      return cursor.hide();
    }

    const startIndex = this._indexWithinQuillBounds(cursor.range.index);
    const endIndex = this._indexWithinQuillBounds(cursor.range.index + cursor.range.length);

    const startLeaf = this._quill.getLeaf(startIndex);
    const endLeaf = this._quill.getLeaf(endIndex);

    if (!this._leafIsValid(startLeaf) || !this._leafIsValid(endLeaf)) {
      return cursor.hide();
    }

    cursor.show();

    const endBounds = this._quill.getBounds(endIndex);
    cursor.updateCaret(endBounds);

    const ranges = this._lineRanges(cursor, startLeaf, endLeaf);
    const selectionRectangles = ranges
      .reduce((rectangles, range) => rectangles.concat(Array.from(RangeFix.getClientRects(range))), []);

    const containerRectangle = this._quill.container.getBoundingClientRect();
    cursor.updateSelection(selectionRectangles, containerRectangle);
  }

  private _indexWithinQuillBounds(index: number): number {
    index = Math.max(index, 0);
    index = Math.min(index, this._quill.getLength());
    return index;
  }

  private _leafIsValid(leaf: any): boolean {
    return leaf && leaf[0] && leaf[0].domNode && leaf[1] >= 0;
  }

  private _emitSelection() {
    this._quill.emitter.emit(
      this._quill.constructor.events.SELECTION_CHANGE,
      this._quill.getSelection(),
      this._currentSelection,
      this._options.selectionChangeSource
    );
  }

  private _setDefaults(options: IQuillCursorsOptions): IQuillCursorsOptions {
    options = Object.assign({}, options);

    options.template = options.template || template;
    options.containerClass = options.containerClass || 'ql-cursors';

    if (options.selectionChangeSource !== null) {
      options.selectionChangeSource = options.selectionChangeSource || this._quill.constructor.sources.API;
    }

    options.hideDelayMs = Number.isInteger(options.hideDelayMs) ? options.hideDelayMs : 3000;
    options.hideSpeedMs = Number.isInteger(options.hideSpeedMs) ? options.hideSpeedMs : 400;

    return options;
  }

  // Rather than just use the start leaf and end leaf directly to build a single range,
  // we instead find all the lines in that single range and create a sub-range for each
  // of these lines. This avoids the browser creating a range around an entire paragraph
  // element, and instead forces the browser to draw rectangles around the paragraph's
  // constituent text nodes, which is more consistent with the existing browser selection
  // behaviour.
  private _lineRanges(cursor: Cursor, startLeaf: any[], endLeaf: any[]): Range[] {
    const lines = this._quill.getLines(cursor.range);
    return lines.reduce((ranges: Range[], line: any, index: number) => {
      if (!line.children) {
        const singleElementRange = document.createRange();
        singleElementRange.selectNode(line.domNode);
        return ranges.concat(singleElementRange);
      }

      const [rangeStart, startOffset] = index === 0
        ? startLeaf
        : line.path(0).pop();

      const [rangeEnd, endOffset] = index === lines.length - 1
        ? endLeaf
        : line.path(line.length() - 1).pop();

      const range = document.createRange();
      range.setStart(rangeStart.domNode, startOffset);
      range.setEnd(rangeEnd.domNode, endOffset);

      return ranges.concat(range);
    }, []);
  }
}
