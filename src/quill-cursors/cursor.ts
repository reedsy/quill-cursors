import IQuillCursorsOptions from './i-quill-cursors-options';
import IQuillRange from './i-range';
import * as tinycolor from 'tinycolor2';

export default class Cursor {
  public static readonly CONTAINER_ELEMENT_TAG = 'SPAN';
  public static readonly SELECTION_ELEMENT_TAG = 'SPAN';
  public static readonly CURSOR_CLASS = 'ql-cursor';
  public static readonly SELECTION_CLASS = 'ql-cursor-selections';
  public static readonly SELECTION_BLOCK_CLASS = 'ql-cursor-selection-block';
  public static readonly CARET_CLASS = 'ql-cursor-caret';
  public static readonly CARET_CONTAINER_CLASS = 'ql-cursor-caret-container';
  public static readonly FLAG_CLASS = 'ql-cursor-flag';
  public static readonly FLAG_FLAP_CLASS = 'ql-cursor-flag-flap';
  public static readonly NAME_CLASS = 'ql-cursor-name';
  public static readonly HIDDEN_CLASS = 'hidden';

  public readonly id: string;
  public readonly name: string;
  public readonly color: string;
  public range: IQuillRange;

  private _el: HTMLElement;
  private _selectionEl: HTMLElement;
  private _caretEl: HTMLElement;
  private _flagEl: HTMLElement;

  public constructor(id: string, name: string, color: string) {
    this.id = id;
    this.name = name;
    this.color = color;
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

    flagElement.style.transitionDelay = `${options.hideDelayMs}ms`;
    flagElement.style.transitionDuration = `${options.hideSpeedMs}ms`;

    this._el = element;
    this._selectionEl = selectionElement;
    this._caretEl = caretContainerElement;
    this._flagEl = flagElement;

    return this._el;
  }

  public show() {
    this._el.classList.remove(Cursor.HIDDEN_CLASS);
  }

  public hide() {
    this._el.classList.add(Cursor.HIDDEN_CLASS);
  }

  public remove() {
    this._el.parentNode.removeChild(this._el);
  }

  public updateCaret(rectangle: ClientRect) {
    this._caretEl.style.top = `${rectangle.top}px`;
    this._caretEl.style.left = `${rectangle.left}px`;
    this._caretEl.style.height = `${rectangle.height}px`;

    this._flagEl.style.top = `${rectangle.top}px`;
    this._flagEl.style.left = `${rectangle.left}px`;
  }

  public updateSelection(selections: ClientRect[], container: ClientRect) {
    this._clearSelection();
    selections = selections || [];
    selections = Array.from(selections);
    selections = this._sanitize(selections);
    selections = this._sortByDomPosition(selections);
    selections.forEach((selection: ClientRect) => this._addSelection(selection, container));
  }

  private _clearSelection() {
    this._selectionEl.innerHTML = null;
  }

  private _addSelection(selection: ClientRect, container: ClientRect) {
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
