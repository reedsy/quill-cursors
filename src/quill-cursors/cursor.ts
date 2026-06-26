import IQuillCursorsOptions from './i-quill-cursors-options';
import IQuillRange from './i-range';
import {ICoordinates} from './i-coordinates';
import CursorHighlight from './cursor-highlight';

export default class Cursor {
  public static readonly CONTAINER_ELEMENT_TAG = 'SPAN';
  public static readonly CURSOR_CLASS = 'ql-cursor';
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
  public readonly highlightName: string;

  private _el: HTMLElement;
  private _caretEl: HTMLElement;
  private _flagEl: HTMLElement;
  private _hideDelay: string;
  private _hideSpeedMs: number;
  private _positionFlag: (flag: HTMLElement, caretRectangle: ClientRect, container: ClientRect) => void;
  private readonly _highlight: CursorHighlight;

  public constructor(id: string, name: string, color: string) {
    this.id = id;
    this.name = name;
    this.color = color;
    this._highlight = new CursorHighlight(color);
    this.highlightName = this._highlight.name;
    this.toggleNearCursor = this.toggleNearCursor.bind(this);
    this._toggleOpenedCursor = this._toggleOpenedCursor.bind(this);
    this._setHoverState = this._setHoverState.bind(this);
  }

  public build(options: IQuillCursorsOptions): HTMLElement {
    const element = document.createElement(Cursor.CONTAINER_ELEMENT_TAG);
    element.classList.add(Cursor.CURSOR_CLASS);
    element.id = `ql-cursor-${ this.id }`;
    element.innerHTML = options.template;
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
    this._caretEl = caretContainerElement;
    this._flagEl = flagElement;

    caretContainerElement.addEventListener('mouseover', this._setHoverState, {passive: true});

    return this._el;
  }

  public show(): void {
    this._el.classList.remove(Cursor.HIDDEN_CLASS);
  }

  // Also clears the highlight: it lives in the global registry, not in this
  // cursor's hidden DOM container. No restore needed on show() — full updates
  // always follow show() with a selection update, and caret-only updates
  // (scroll/resize) intentionally leave the highlight untouched.
  public hide(): void {
    this._el.classList.add(Cursor.HIDDEN_CLASS);
    this._highlight.clear();
  }

  public remove(): void {
    this._highlight.detach();
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

  public setSelectionRange(range: Range | null): void {
    this._highlight.setRange(range, this._el.getRootNode());
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
}
