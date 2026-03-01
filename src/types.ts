export interface QuillRange {
  index: number;
  length: number;
}

export interface CursorOptions {
  containerClass?: string;
  selectionChangeSource?: string | null;
  hideDelayMs?: number;
  hideSpeedMs?: number;
  transformOnTextChange?: boolean;
  boundsContainer?: HTMLElement;
  positionFlag?: (flag: HTMLElement, caretRect: DOMRect, container: DOMRect) => void;
}

export interface QuillInstance {
  on(event: string, handler: (...args: any[]) => void): void;
  addContainer(className: string): HTMLElement;
  getLeaf(index: number): [{ domNode: Node }, number] | null;
  getLines(range: QuillRange): any[];
  getBounds(index: number): DOMRect;
  getSelection(): QuillRange | null;
  getLength(): number;
  container: HTMLElement;
  constructor: { events: { SELECTION_CHANGE: string; TEXT_CHANGE: string } };
  emitter: { emit(event: string, ...args: any[]): void };
}

// Minimal typing for CSS Highlight API (for environments without full DOM typings)
export interface HighlightSet {
  add(range: Range): void;
  delete(range: Range): void;
  clear(): void;
}
