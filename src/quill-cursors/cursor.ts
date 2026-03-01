import { CursorOptions, HighlightSet, QuillRange } from '../types';

// Use any-cast accessors for CSS Highlight API since DOM lib typings vary by TS version
const cssHighlights = (): Map<string, HighlightSet> => (CSS as any).highlights;
const createHighlight = (): HighlightSet => new (globalThis as any).Highlight();

function toRgba(color: string, alpha: number): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return color;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const { data } = ctx.getImageData(0, 0, 1, 1);
    return `rgba(${data[0]},${data[1]},${data[2]},${alpha})`;
  } catch {
    return color;
  }
}

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
  public range: QuillRange;

  private _el: HTMLElement;
  private _caretEl: HTMLElement;
  private _flagEl: HTMLElement;
  private _hideSpeedMs: number;
  private _positionFlag: (flag: HTMLElement, caretRectangle: DOMRect, container: DOMRect) => void;
  private _highlight: HighlightSet;
  private _styleEl: HTMLStyleElement;

  public constructor(id: string, name: string, color: string) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.toggleNearCursor = this.toggleNearCursor.bind(this);
    this._toggleOpenedCursor = this._toggleOpenedCursor.bind(this);
    this._setHoverState = this._setHoverState.bind(this);
  }

  public build(options: CursorOptions): HTMLElement {
    const element = document.createElement(Cursor.CONTAINER_ELEMENT_TAG);
    element.classList.add(Cursor.CURSOR_CLASS);
    element.id = `ql-cursor-${this.id}`;
    element.innerHTML = `
      <span class="${Cursor.CARET_CONTAINER_CLASS}">
        <span class="${Cursor.CARET_CLASS}"></span>
      </span>
      <div class="${Cursor.FLAG_CLASS}">
        <small class="${Cursor.NAME_CLASS}"></small>
      </div>
    `;

    const caretContainerElement = element.getElementsByClassName(Cursor.CARET_CONTAINER_CLASS)[0] as HTMLElement;
    const caretElement = caretContainerElement.getElementsByClassName(Cursor.CARET_CLASS)[0] as HTMLElement;
    const flagElement = element.getElementsByClassName(Cursor.FLAG_CLASS)[0] as HTMLElement;

    flagElement.style.backgroundColor = this.color;
    caretElement.style.backgroundColor = this.color;
    element.getElementsByClassName(Cursor.NAME_CLASS)[0].textContent = this.name;

    this._hideSpeedMs = options.hideSpeedMs;
    this._positionFlag = options.positionFlag;
    flagElement.style.transitionDelay = `${options.hideDelayMs}ms`;
    flagElement.style.transitionDuration = `${options.hideSpeedMs}ms`;

    this._el = element;
    this._caretEl = caretContainerElement;
    this._flagEl = flagElement;

    caretContainerElement.addEventListener('mouseover', this._setHoverState, { passive: true });

    // Register CSS Custom Highlight for selection rendering
    const highlightName = `quill-cursor-${this.id}`;
    this._highlight = createHighlight();
    cssHighlights().set(highlightName, this._highlight);

    this._styleEl = document.createElement('style');
    this._styleEl.textContent =
      `::highlight(${highlightName}) { background-color: ${toRgba(this.color, 0.3)}; color: inherit; }`;
    document.head.appendChild(this._styleEl);

    return this._el;
  }

  public show(): void {
    this._el.classList.remove(Cursor.HIDDEN_CLASS);
  }

  public hide(): void {
    this._el.classList.add(Cursor.HIDDEN_CLASS);
    if (this._highlight) this._highlight.clear();
  }

  public remove(): void {
    cssHighlights().delete(`quill-cursor-${this.id}`);
    this._styleEl.remove();
    this._el.parentNode?.removeChild(this._el);
  }

  public toggleNearCursor(pointX: number, pointY: number): boolean {
    const { left, right, top, bottom } = this._getCoordinates();

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
    // Wait for the animation before removing the delay class
    setTimeout(() => this._flagEl.classList.remove(Cursor.NO_DELAY_CLASS), this._hideSpeedMs);
  }

  public updateCaret(rectangle: DOMRect, container: DOMRect): void {
    this._caretEl.style.top = `${rectangle.top}px`;
    this._caretEl.style.left = `${rectangle.left}px`;
    this._caretEl.style.height = `${rectangle.height}px`;

    if (this._positionFlag) {
      this._positionFlag(this._flagEl, rectangle, container);
    } else {
      this._updateCaretFlag(rectangle, container);
    }
  }

  public updateHighlight(ranges: Range[]): void {
    this._highlight.clear();
    ranges.forEach((r) => this._highlight.add(r));
  }

  private _setHoverState(): void {
    document.addEventListener('mousemove', this._toggleOpenedCursor, { passive: true });
  }

  private _toggleOpenedCursor(e: MouseEvent): void {
    const shouldShow = this.toggleNearCursor(e.clientX, e.clientY);
    this._caretEl.classList.toggle(Cursor.CONTAINER_NO_POINTER_CLASS, shouldShow);
    if (!shouldShow) document.removeEventListener('mousemove', this._toggleOpenedCursor);
  }

  private _getCoordinates(): DOMRect {
    return this._caretEl.getBoundingClientRect();
  }

  private _updateCaretFlag(caretRectangle: DOMRect, container: DOMRect): void {
    this._flagEl.style.width = '';
    const flagRect = this._flagEl.getBoundingClientRect();

    this._flagEl.classList.remove(Cursor.FLAG_FLIPPED_CLASS);
    if (caretRectangle.left > container.width - flagRect.width) {
      this._flagEl.classList.add(Cursor.FLAG_FLIPPED_CLASS);
    }
    this._flagEl.style.left = `${caretRectangle.left}px`;
    this._flagEl.style.top = `${caretRectangle.top}px`;
    // Chrome has an issue when doing translate3D with non-integer width
    this._flagEl.style.width = `${Math.ceil(flagRect.width)}px`;
  }
}
