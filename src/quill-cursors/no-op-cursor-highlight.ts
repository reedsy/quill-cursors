import ICursorHighlight from './i-cursor-highlight';

// Stands in for CursorHighlight when the CSS Custom Highlight API is
// unsupported: text selections are skipped entirely.
export default class NoOpCursorHighlight implements ICursorHighlight {
  public readonly name = '';

  public setRange(): void {
    // no-op
  }

  public clear(): void {
    // no-op
  }

  public setVisible(): void {
    // no-op
  }

  public detach(): void {
    // no-op
  }
}
