import Cursor from './cursor';
import { CursorOptions } from '../types';

describe('Cursor', () => {
  let options: CursorOptions;

  beforeEach(() => {
    options = {
      hideDelayMs: 100,
      hideSpeedMs: 200,
      positionFlag: null,
    };

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores constructor parameters', () => {
    const cursor = new Cursor('abc', 'Joe Bloggs', 'red');

    expect(cursor.id).toBe('abc');
    expect(cursor.name).toBe('Joe Bloggs');
    expect(cursor.color).toBe('red');
  });

  it('builds the cursor element with caret and flag', () => {
    const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
    const element = cursor.build(options);

    const caretEl = element.querySelector(`.${Cursor.CARET_CLASS}`) as HTMLElement;
    expect(caretEl.style.backgroundColor).toBe('red');

    const flagEl = element.querySelector(`.${Cursor.FLAG_CLASS}`) as HTMLElement;
    expect(flagEl.style.backgroundColor).toBe('red');
    expect(flagEl.style.transitionDelay).toBe('100ms');
    expect(flagEl.style.transitionDuration).toBe('200ms');

    expect(element.querySelector(`.${Cursor.NAME_CLASS}`).textContent).toBe('Jane Bloggs');
  });

  it('adds the ID to the element', () => {
    const element = new Cursor('abc', 'Jane Bloggs', 'red').build(options);
    expect(element.id).toBe('ql-cursor-abc');
  });

  it('registers a CSS highlight on build', () => {
    const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
    cursor.build(options);
    expect((CSS as any).highlights.has('quill-cursor-abc')).toBe(true);
  });

  it('adds a style element to document.head on build', () => {
    const before = document.head.querySelectorAll('style').length;
    const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
    cursor.build(options);
    expect(document.head.querySelectorAll('style').length).toBe(before + 1);
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

  it('removes the CSS highlight on remove', () => {
    const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
    const element = cursor.build(options);
    const parent = document.createElement('DIV');
    parent.appendChild(element);
    document.body.appendChild(parent);

    expect((CSS as any).highlights.has('quill-cursor-abc')).toBe(true);
    cursor.remove();
    expect((CSS as any).highlights.has('quill-cursor-abc')).toBe(false);
  });

  it('removes the style element on remove', () => {
    const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
    const element = cursor.build(options);
    const parent = document.createElement('DIV');
    parent.appendChild(element);
    document.body.appendChild(parent);

    const before = document.head.querySelectorAll('style').length;
    cursor.remove();
    expect(document.head.querySelectorAll('style').length).toBe(before - 1);
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
    options.positionFlag = vi.fn();
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
    vi.advanceTimersByTime(options.hideSpeedMs);
    expect(flag).not.toHaveClass(Cursor.NO_DELAY_CLASS);
  });

  describe('updateHighlight', () => {
    let cursor: Cursor;

    beforeEach(() => {
      cursor = new Cursor('abc', 'Jane Bloggs', 'red');
      cursor.build(options);
    });

    it('adds ranges to the highlight', () => {
      const range1 = document.createRange();
      const range2 = document.createRange();
      cursor.updateHighlight([range1, range2]);

      const highlight: any = (CSS as any).highlights.get('quill-cursor-abc');
      expect([...highlight]).toContain(range1);
      expect([...highlight]).toContain(range2);
    });

    it('clears previous ranges on update', () => {
      const range1 = document.createRange();
      cursor.updateHighlight([range1]);

      const range2 = document.createRange();
      cursor.updateHighlight([range2]);

      const highlight: any = (CSS as any).highlights.get('quill-cursor-abc');
      expect([...highlight]).not.toContain(range1);
      expect([...highlight]).toContain(range2);
    });

    it('accepts an empty array', () => {
      const range1 = document.createRange();
      cursor.updateHighlight([range1]);
      cursor.updateHighlight([]);

      const highlight: any = (CSS as any).highlights.get('quill-cursor-abc');
      expect([...highlight]).toHaveLength(0);
    });
  });

  describe('mouse move handlers', () => {
    it('add listener to document by mouse over', () => {
      vi.spyOn(document, 'addEventListener');
      const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
      const element = cursor.build(options);
      const container = element.getElementsByClassName(Cursor.CARET_CONTAINER_CLASS)[0];
      const mouseEvent = new MouseEvent('mouseover');
      container.dispatchEvent(mouseEvent);
      expect(document.addEventListener).toHaveBeenCalled();
    });

    it('add listeners to document by mouse over', () => {
      vi.spyOn(document, 'addEventListener');
      const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
      const element = cursor.build(options);
      const container = element.getElementsByClassName(Cursor.CARET_CONTAINER_CLASS)[0];
      const mouseEvent = new MouseEvent('mouseover');
      container.dispatchEvent(mouseEvent);
      expect(document.addEventListener).toHaveBeenCalled();
      vi.runAllTimers();
      expect(document.addEventListener).toHaveBeenCalledTimes(2);
    });

    it('keep flag opened if the pointer is near cursor', () => {
      vi.spyOn(document, 'addEventListener');
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
      vi.spyOn(document, 'addEventListener');
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
