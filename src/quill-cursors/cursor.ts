import IQuillCursorsOptions from './i-quill-cursors-options';
import IQuillRange from './i-range';
import tinycolor = require('tinycolor2');
import {ICoordinates} from './i-coordinates';

export default class Cursor {
  public static readonly CONTAINER_ELEMENT_TAG = 'SPAN';
  public static readonly SELECTION_ELEMENT_TAG = 'SPAN';
  public static readonly CURSOR_CLASS = 'ql-cursor';
  public static readonly SELECTION_CLASS = 'ql-cursor-selections';
  public static readonly SELECTION_BLOCK_CLASS = 'ql-cursor-selection-block';
  public static readonly CARET_CLASS = 'ql-cursor-caret';
  public static readonly CARET_CONTAINER_CLASS = 'ql-cursor-caret-container';
  public static readonly CONTAINER_HOVER_CLASS = 'hover';
  public static readonly CONTAINER_NO_POINTER_CLASS = 'no-pointer';
  public static readonly FLAG_CLASS = 'ql-cursor-flag';
  public static readonly FLAG_FLIPPED_CLASS = 'flag-flipped';
  public static readonly NAME_CLASS = 'ql-cursor-name';
  public static readonly HIDDEN_CLASS = 'hidden';
  public static readonly NO_DELAY_CLASS = 'no-delay';

  public readonly id: string;
  public readonly name: string;
  public readonly color: string;
  public range: IQuillRange;

  private _el: HTMLElement;
  private _selectionEl: HTMLElement;
  private _caretEl: HTMLElement;
  private _flagEl: HTMLElement;
  private _hideDelay: string;
  private _hideSpeedMs: number;
  private _positionFlag: (flag: HTMLElement, caretRectangle: ClientRect, container: ClientRect) => void;

  public constructor(id: string, name: string, color: string) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.toggleNearCursor = this.toggleNearCursor.bind(this);
    this._toggleOpenedCursor = this._toggleOpenedCursor.bind(this);
    this._setHoverState = this._setHoverState.bind(this);
  }

  public build(options: IQuillCursorsOptions): HTMLElement {
    const element = document.createElement(Cursor.CONTAINER_ELEMENT_TAG);
    element.classList.add(Cursor.CURSOR_CLASS);
    element.id = `ql-cursor-${ this.id }`;
    element.innerHTML = options.template;
    const selectionElement = element.getElementsByClassName(Cursor.SELECTION_CLASS)[0] as HTMLElement;
    const caretContainerElement = element.getElementsByClassName(Cursor.CARET_CONTAINER_CLASS)[0] as HTMLElement;
    const caretElement = caretContainerElement.getElementsByClassName(Cursor.CARET_CLASS)[0] as HTMLElement;
    const flagElement = element.getElementsByClassName(Cursor.FLAG_CLASS)[0] as HTMLElement;

    flagElement.style.backgroundColor = this.color;
    caretElement.style.backgroundColor = this.color;

    element.getElementsByClassName(Cursor.NAME_CLASS)[0].textContent = this.name;

    this._hideDelay = `${options.hideDelayMs}ms`;
    this._hideSpeedMs = options.hideSpeedMs;
    this._positionFlag = options.positionFlag;
    flagElement.style.transitionDelay = this._hideDelay;
    flagElement.style.transitionDuration = `${this._hideSpeedMs}ms`;

    this._el = element;
    this._selectionEl = selectionElement;
    this._caretEl = caretContainerElement;
    this._flagEl = flagElement;

    caretContainerElement.addEventListener('mouseover', this._setHoverState, {passive: true});

    return this._el;
  }

  public show(): void {
    this._el.classList.remove(Cursor.HIDDEN_CLASS);
  }

  public hide(): void {
    this._el.classList.add(Cursor.HIDDEN_CLASS);
  }

  public remove(): void {
    this._el.parentNode.removeChild(this._el);
  }

  public toggleNearCursor(pointX: number, pointY: number): boolean {
    const {left, right, top, bottom} = this._getCoordinates();

    const isXNear = pointX >= left && pointX <= right;
    const isYNear = pointY >= top && pointY <= bottom;
    const shouldShow = isXNear && isYNear;

    this._caretEl.classList.toggle(Cursor.CONTAINER_HOVER_CLASS, shouldShow);

    return shouldShow;
  }

  public toggleFlag(shouldShow?: boolean): void {
    const isShown = this._caretEl.classList.toggle(Cursor.CONTAINER_HOVER_CLASS, shouldShow);
    if (isShown) return;

    this._flagEl.classList.add(Cursor.NO_DELAY_CLASS);
    // We have to wait for the animation before we can put the delay back
    setTimeout(() => this._flagEl.classList.remove(Cursor.NO_DELAY_CLASS), this._hideSpeedMs);
  }

  public updateCaret(rectangle: ClientRect, container: ClientRect): void {
    this._caretEl.style.top = `${rectangle.top}px`;
    this._caretEl.style.left = `${rectangle.left}px`;
    this._caretEl.style.height = `${rectangle.height}px`;

    if (this._positionFlag) {
      this._positionFlag(this._flagEl, rectangle, container);
    } else {
      this._updateCaretFlag(rectangle, container);
    }
  }

  public updateSelection(selections: ClientRect[], container: ClientRect): void {
    this._clearSelection();
    selections = selections || [];
    selections = Array.from(selections);
    selections = this._sanitize(selections);
    selections = this._sortByDomPosition(selections);
    selections.forEach((selection: ClientRect) => this._addSelection(selection, container));
  }

  private _setHoverState(): void {
    document.addEventListener('mousemove', this._toggleOpenedCursor, {passive: true});
  }

  private _toggleOpenedCursor(e: MouseEvent): void {
    const shouldShow = this.toggleNearCursor(e.clientX, e.clientY);
    this._caretEl.classList.toggle(Cursor.CONTAINER_NO_POINTER_CLASS, shouldShow);
    if (!shouldShow) document.removeEventListener('mousemove', this._toggleOpenedCursor);
  }

  private _getCoordinates(): ICoordinates {
    return this._caretEl.getBoundingClientRect();
  }

  private _updateCaretFlag(caretRectangle: ClientRect, container: ClientRect): void {
    this._flagEl.style.width = '';
    const flagRect = this._flagEl.getBoundingClientRect();

    this._flagEl.classList.remove(Cursor.FLAG_FLIPPED_CLASS);
    if (caretRectangle.left > container.width - flagRect.width) {
      this._flagEl.classList.add(Cursor.FLAG_FLIPPED_CLASS);
    }
    this._flagEl.style.left = `${caretRectangle.left}px`;
    this._flagEl.style.top = `${caretRectangle.top}px`;
    // Chrome has an issue when doing translate3D with non integer width, this ceil is to overcome it.
    this._flagEl.style.width = `${Math.ceil(flagRect.width)}px`;
  }

  private _clearSelection(): void {
    this._selectionEl.innerHTML = '';
  }

  private _addSelection(selection: ClientRect, container: ClientRect): void {
    const selectionBlock = this._selectionBlock(selection, container);
    this._selectionEl.appendChild(selectionBlock);
  }

  private _selectionBlock(selection: ClientRect, container: ClientRect): HTMLElement {
    const element = document.createElement(Cursor.SELECTION_ELEMENT_TAG);

    element.classList.add(Cursor.SELECTION_BLOCK_CLASS);
    element.style.top = `${selection.top - container.top}px`;
    element.style.left = `${selection.left - container.left}px`;
    element.style.width = `${selection.width}px`;
    element.style.height = `${selection.height}px`;
    element.style.backgroundColor = tinycolor(this.color).setAlpha(0.3).toString();

    return element;
  }

  private _sortByDomPosition(selections: ClientRect[]): ClientRect[] {
    return selections.sort((a, b) => {
      if (a.top === b.top) {
        return a.left - b.left;
      }

      return a.top - b.top;
    });
  }

  private _sanitize(selections: ClientRect[]): ClientRect[] {
    const serializedSelections = new Set();

    return selections.filter((selection: ClientRect) => {
      if (!selection.width || !selection.height) {
        return false;
      }

      const serialized = this._serialize(selection);
      if (serializedSelections.has(serialized)) {
        return false;
      }

      serializedSelections.add(serialized);
      return true;
    });
  }

  private _serialize(selection: ClientRect): string {
    return [
      `top:${ selection.top }`,
      `right:${ selection.right }`,
      `bottom:${ selection.bottom }`,
      `left:${ selection.left }`,
    ].join(';');
  }
}
