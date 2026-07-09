import Cursor from './cursor';
import IQuillCursorsOptions from './i-quill-cursors-options';
import '@testing-library/jest-dom/extend-expect';

describe('Cursor', () => {
  let template: string;
  let options: IQuillCursorsOptions;

  beforeEach(() => {
    template = `
      <span class="ql-cursor-selections"></span>
      <span class="ql-cursor-caret-container">
        <span class="ql-cursor-caret"></span>
      </span>
      <div class="ql-cursor-flag">
        <small class="ql-cursor-name"></small>
        <span class="ql-cursor-flag-flap"></span>
      </div>
    `;

    options = {
      template: template,
      hideDelayMs: 100,
      hideSpeedMs: 200,
      positionFlag: null,
    };

    jest.useFakeTimers();
  });

  it('stores constructor parameters', () => {
    const cursor = new Cursor('abc', 'Joe Bloggs', 'red');

    expect(cursor.id).toBe('abc');
    expect(cursor.name).toBe('Joe Bloggs');
    expect(cursor.color).toBe('red');
  });

  it('builds the cursor element', () => {
    const element = new Cursor('abc', 'Jane Bloggs', 'red').build(options);

    expect(element).toContainHTML(`
      <span class="ql-cursor-selections"></span>
      <span class="ql-cursor-caret-container">
        <span class="ql-cursor-caret" style="background-color: red;"></span>
      </span>
      <div class="ql-cursor-flag" style="background-color: red; transition-delay: 100ms; transition-duration: 200ms;">
        <small class="ql-cursor-name">Jane Bloggs</small>
        <span class="ql-cursor-flag-flap"></span>
      </div>
    `);
  });

  it('tolerates templates without a selections element', () => {
    options.template = `
      <span class="ql-cursor-caret-container">
        <span class="ql-cursor-caret"></span>
      </span>
      <div class="ql-cursor-flag">
        <small class="ql-cursor-name"></small>
      </div>
    `;
    const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
    cursor.build(options);

    const rectangle: any = {top: 10, left: 10, width: 100, height: 20};
    const container: any = {top: 0, left: 0, width: 500, height: 500};
    expect(() => cursor.updateEmbedSelections([rectangle], container)).not.toThrow();
  });

  it('adds the ID to the element', () => {
    const element = new Cursor('abc', 'Jane Bloggs', 'red').build(options);
    expect(element.id).toBe('ql-cursor-abc');
  });

  it('toggles element visibility', () => {
    const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
    const element = cursor.build(options);
    expect(element.classList.contains('hidden')).toBe(false);

    cursor.hide();
    expect(element.classList.contains('hidden')).toBe(true);

    cursor.show();
    expect(element.classList.contains('hidden')).toBe(false);
  });

  it('removes the element from the DOM', () => {
    const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
    const element = cursor.build(options);
    const parent = document.createElement('DIV');
    document.body.appendChild(parent);

    expect(element).not.toBeInTheDocument();
    parent.appendChild(element);
    expect(element).toBeInTheDocument();

    cursor.remove();
    expect(element).not.toBeInTheDocument();
  });

  it('exposes a unique highlight name', () => {
    const first = new Cursor('abc', 'Jane Bloggs', 'red');
    const second = new Cursor('def', 'Joe Bloggs', 'blue');

    expect(first.highlightName).toMatch(/^ql-cursor-highlight-\d+$/);
    expect(first.highlightName).not.toBe(second.highlightName);
  });

  it('uses a no-op highlight when the Highlight API is unsupported', () => {
    const highlight = (globalThis as any).Highlight;
    delete (globalThis as any).Highlight;
    try {
      const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
      cursor.build(options);

      expect(cursor.highlightName).toBe('');
      expect(() => cursor.setSelectionRange(document.createRange())).not.toThrow();
      expect((CSS as any).highlights.size).toBe(0);
    } finally {
      (globalThis as any).Highlight = highlight;
    }
  });

  describe('embed selections', () => {
    let cursor: Cursor;
    let element: HTMLElement;
    let container: any;

    beforeEach(() => {
      cursor = new Cursor('abc', 'Jane Bloggs', 'red');
      element = cursor.build(options);
      container = {top: 5, left: 5, width: 2000, height: 2000};
    });

    it('draws a tinted block over each rectangle', () => {
      cursor.updateEmbedSelections([
        {top: 10, left: 20, width: 100, height: 50},
        {top: 100, left: 20, width: 200, height: 80},
      ] as any, container);

      const blocks = element.getElementsByClassName(Cursor.SELECTION_BLOCK_CLASS);
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toHaveStyle('top: 5px');
      expect(blocks[0]).toHaveStyle('left: 15px');
      expect(blocks[0]).toHaveStyle('width: 100px');
      expect(blocks[0]).toHaveStyle('height: 50px');
      expect(blocks[0]).toHaveStyle('background-color: red');
    });

    it('clears previous blocks on update', () => {
      cursor.updateEmbedSelections([{top: 10, left: 20, width: 100, height: 50}] as any, container);
      cursor.updateEmbedSelections([], container);

      expect(element.getElementsByClassName(Cursor.SELECTION_BLOCK_CLASS)).toHaveLength(0);
    });

    it('skips rectangles without an area', () => {
      cursor.updateEmbedSelections([
        {top: 10, left: 20, width: 0, height: 50},
        {top: 10, left: 20, width: 100, height: 0},
      ] as any, container);

      expect(element.getElementsByClassName(Cursor.SELECTION_BLOCK_CLASS)).toHaveLength(0);
    });
  });

  describe('selection range highlight', () => {
    let cursor: Cursor;
    let element: HTMLElement;

    beforeEach(() => {
      cursor = new Cursor('abc', 'Jane Bloggs', 'red');
      element = cursor.build(options);
      document.body.appendChild(element);
    });

    afterEach(() => {
      if (element.parentNode) element.parentNode.removeChild(element);
    });

    it('registers the range in the highlight registry', () => {
      const range = document.createRange();

      cursor.setSelectionRange(range);

      const registered: any = (CSS as any).highlights.get(cursor.highlightName);
      expect(registered.has(range)).toBe(true);
    });

    it('adopts a stylesheet with the cursor color', () => {
      cursor.setSelectionRange(document.createRange());

      const sheets: any[] = (document as any).adoptedStyleSheets;
      expect(sheets).toHaveLength(1);
      expect(sheets[0].cssText).toContain('color-mix(in srgb, red calc(var(--ql-cursor-selection-fade, 0.3) * 100%)');
    });

    it('empties the highlight when passed null', () => {
      cursor.setSelectionRange(document.createRange());
      cursor.setSelectionRange(null);

      const registered: any = (CSS as any).highlights.get(cursor.highlightName);
      expect(registered.size).toBe(0);
    });

    it('empties the highlight when the cursor is hidden', () => {
      cursor.setSelectionRange(document.createRange());

      cursor.hide();

      const registered: any = (CSS as any).highlights.get(cursor.highlightName);
      expect(registered.size).toBe(0);
    });

    it('unregisters the highlight when the cursor is removed', () => {
      cursor.setSelectionRange(document.createRange());

      cursor.remove();

      expect((CSS as any).highlights.has(cursor.highlightName)).toBe(false);
      expect((document as any).adoptedStyleSheets).toHaveLength(0);
    });
  });

  it('updates the caret position', () => {
    const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
    const element = cursor.build(options);

    const rectangle: any = {
      top: 100,
      left: 200,
      height: 50,
    };

    const boundRectangle: any = {
      top: 0,
      left: 0,
      height: 50000,
      width: 50000,
    };

    cursor.updateCaret(rectangle, boundRectangle);

    const caretContainer = element.getElementsByClassName(Cursor.CARET_CONTAINER_CLASS)[0];
    expect(caretContainer).toHaveStyle('top: 100px');
    expect(caretContainer).toHaveStyle('left: 200px');
    expect(caretContainer).toHaveStyle('height: 50px');

    const flag = element.getElementsByClassName(Cursor.FLAG_CLASS)[0];
    expect(flag).toHaveStyle('top: 100px');
    expect(flag).toHaveStyle('left: 200px');
  });

  it('updates the caret position flipping flag', () => {
    const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
    const element = cursor.build(options);

    const rectangle: any = {
      top: 100,
      left: 700,
      height: 50,
    };

    const boundRectangle: any = {
      top: 0,
      left: 0,
      height: 50000,
      width: 550,
    };

    cursor.updateCaret(rectangle, boundRectangle);

    const caretContainer = element.getElementsByClassName(Cursor.CARET_CONTAINER_CLASS)[0];
    expect(caretContainer).toHaveStyle('top: 100px');
    expect(caretContainer).toHaveStyle('left: 700px');
    expect(caretContainer).toHaveStyle('height: 50px');

    const flag = element.getElementsByClassName(Cursor.FLAG_CLASS)[0];
    expect(flag).toHaveStyle('top: 100px');
    expect(flag).toHaveStyle('left: 700px');
    expect(flag).toHaveClass(Cursor.FLAG_FLIPPED_CLASS);
  });

  it('updates flag with custom position method', () => {
    const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
    options.positionFlag = jest.fn();
    cursor.build(options);

    const rectangle: any = {
      top: 100,
      left: 200,
      height: 50,
    };

    const boundRectangle: any = {
      top: 0,
      left: 0,
      height: 50000,
      width: 50000,
    };

    cursor.updateCaret(rectangle, boundRectangle);

    expect(options.positionFlag).toHaveBeenCalled();
  });

  it('toggles the flag display', () => {
    const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
    const element = cursor.build(options);
    const flag = element.getElementsByClassName(Cursor.CARET_CONTAINER_CLASS)[0];

    expect(flag).not.toHaveClass(Cursor.CONTAINER_HOVER_CLASS);
    cursor.toggleFlag(true);
    expect(flag).toHaveClass(Cursor.CONTAINER_HOVER_CLASS);
    cursor.toggleFlag(false);
    expect(flag).not.toHaveClass(Cursor.CONTAINER_HOVER_CLASS);
    cursor.toggleFlag();
    expect(flag).toHaveClass(Cursor.CONTAINER_HOVER_CLASS);
  });

  it('removes the delay when actively hiding the flag', () => {
    const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
    const element = cursor.build(options);
    const flag = element.getElementsByClassName(Cursor.FLAG_CLASS)[0];

    cursor.toggleFlag(true);
    cursor.toggleFlag(false);
    expect(flag).toHaveClass(Cursor.NO_DELAY_CLASS);
    jest.advanceTimersByTime(options.hideSpeedMs);
    expect(flag).not.toHaveClass(Cursor.NO_DELAY_CLASS);
  });

  describe('mouse move handlers', () => {
    it('add listener to document by mouse over', () => {
      jest.spyOn(document, 'addEventListener');
      const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
      const element = cursor.build(options);
      const container = element.getElementsByClassName(Cursor.CARET_CONTAINER_CLASS)[0];
      const mouseEvent = new MouseEvent('mouseover');
      container.dispatchEvent(mouseEvent);
      expect(document.addEventListener).toHaveBeenCalled();
    });

    it('add listeners to document by mouse over', () => {
      jest.spyOn(document, 'addEventListener');
      const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
      const element = cursor.build(options);
      const container = element.getElementsByClassName(Cursor.CARET_CONTAINER_CLASS)[0];
      const mouseEvent = new MouseEvent('mouseover');
      container.dispatchEvent(mouseEvent);
      expect(document.addEventListener).toHaveBeenCalled();
      jest.runAllTimers();
      expect(document.addEventListener).toHaveBeenCalledTimes(2);
    });

    it('keep flag opened if the pointer is near cursor', () => {
      jest.spyOn(document, 'addEventListener');
      const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
      const element = cursor.build(options);
      const container = element.getElementsByClassName(Cursor.CARET_CONTAINER_CLASS)[0];
      const mouseEvent = new MouseEvent('mouseover', {
        clientX: 0,
        clientY: 0,
      }) as any;
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 0,
        clientY: 0,
      }) as any;
      container.dispatchEvent(mouseEvent);
      document.dispatchEvent(mouseMoveEvent);
      expect(container).toHaveClass(Cursor.CONTAINER_NO_POINTER_CLASS);
    });

    it('hide flag if the pointer is not near cursor', () => {
      jest.spyOn(document, 'addEventListener');
      const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
      const element = cursor.build(options);
      const container = element.getElementsByClassName(Cursor.CARET_CONTAINER_CLASS)[0];
      const mouseEvent = new MouseEvent('mouseover', {
        clientX: 10,
        clientY: 10,
      }) as any;
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 10,
        clientY: 10,
      }) as any;
      container.dispatchEvent(mouseEvent);
      document.dispatchEvent(mouseMoveEvent);
      expect(container).not.toHaveClass(Cursor.CONTAINER_NO_POINTER_CLASS);
    });
  });
});
