import ICursorHighlight from './i-cursor-highlight';
import NoOpCursorHighlight from './no-op-cursor-highlight';

describe('NoOpCursorHighlight', () => {
  it('does nothing and touches no globals', () => {
    const highlight: ICursorHighlight = new NoOpCursorHighlight();

    highlight.setRange(document.createRange(), document);
    highlight.clear();
    highlight.detach();

    expect(highlight.name).toBe('');
    expect((CSS as any).highlights.size).toBe(0);
    expect((document as any).adoptedStyleSheets).toHaveLength(0);
  });
});
