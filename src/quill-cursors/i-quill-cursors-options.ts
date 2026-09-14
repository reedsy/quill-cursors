export default interface IQuillCursorsOptions {
  template?: string;
  containerClass?: string;
  selectionChangeSource?: string | null;
  hideDelayMs?: number;
  hideSpeedMs?: number;
  transformOnTextChange?: boolean;
  boundsContainer?: HTMLElement;
  positionFlag?: (flag: HTMLElement, caretRectangle: ClientRect, container: ClientRect) => void;
}

// The options once QuillCursors.DEFAULTS have been applied.
export interface IQuillCursorsResolvedOptions extends IQuillCursorsOptions {
  template: string;
  containerClass: string;
  selectionChangeSource: string | null;
  hideDelayMs: number;
  hideSpeedMs: number;
}
