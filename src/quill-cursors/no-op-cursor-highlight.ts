import ICursorHighlight from './i-cursor-highlight';

// Used in place of CursorHighlight when the browser does not support the
// CSS Custom Highlight API: carets, flags and embed overlays still render
// (they are plain DOM elements), and text selections are skipped entirely.
export default class NoOpCursorHighlight implements ICursorHighlight {
  public readonly name = '';

  public setRange(): void {
    // no-op
  }

  public clear(): void {
    // no-op
  }

  public detach(): void {
    // no-op
  }
}
