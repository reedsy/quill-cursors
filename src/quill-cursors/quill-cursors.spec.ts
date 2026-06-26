import QuillCursors from './quill-cursors';
import Cursor from './cursor';
import CursorHighlight from './cursor-highlight';
import '@testing-library/jest-dom/extend-expect';

const mockObserver = jest.fn();
const mockDisconnect = jest.fn();
const ResizeObserverMock = jest.fn().mockImplementation(() => ({
  observe: mockObserver,
  disconnect: mockDisconnect,
}));

describe('QuillCursors', () => {
  let quill: any;

  afterEach(() => {
    if (quill.container.parentNode) {
      quill.container.parentNode.removeChild(quill.container);
    }
  });

  beforeEach(() => {
    quill = {
      constructor: {
        events: {
          SELECTION_CHANGE: 'selection-change',
          TEXT_CHANGE: 'text-change',
        },
        sources: {
          API: 'api',
        },
        find: jest.fn(),
      },
      addContainer: (className: string): HTMLElement => {
        const cursorsContainer = document.createElement('DIV');
        cursorsContainer.classList.add(className);
        quill.container.appendChild(cursorsContainer);

        return cursorsContainer;
      },
      container: null,
      emitter: {
        emit: (): void => {},
      },
      getBounds: (): any => {},
      getLeaf: (): any => {},
      getLength: (): number => 0,
      getSelection: (): void => {},
      on: (): void => {},
      off: (): void => {},
    };

    quill.container = document.createElement('DIV');
    document.body.appendChild(quill.container);

    const editor = document.createElement('DIV');
    editor.classList.add('ql-editor');
    quill.container.appendChild(editor);
    quill.root = editor;

    quill.constructor.find.mockReturnValue(quill);

    (globalThis as any).ResizeObserver = ResizeObserverMock;
    ResizeObserverMock.mockClear();
    mockObserver.mockClear();
    mockDisconnect.mockClear();
  });

  describe('initialisation', () => {
    it('adds a container to Quill', () => {
      jest.spyOn(quill, 'addContainer');
      new QuillCursors(quill);
      expect(quill.addContainer).toHaveBeenCalledTimes(1);
    });

    it('repositions only carets on scroll', () => {
      const editor = quill.root;
      jest.spyOn(editor, 'addEventListener');
      const cursors = new QuillCursors(quill);
      expect(editor.addEventListener).toHaveBeenCalledWith('scroll', expect.anything(), {passive: true});

      const cursor = cursors.createCursor('abc', 'Jane Bloggs', 'red');
      cursor.range = {index: 0, length: 1};
      jest.spyOn(quill, 'getLeaf').mockReturnValue([{domNode: document.createTextNode('foo')}, 0]);
      jest.spyOn(quill, 'getBounds').mockReturnValue({top: 0, left: 0, width: 0, height: 0});
      jest.spyOn(cursor, 'updateCaret');
      jest.spyOn(cursor, 'setSelectionRange');

      editor.dispatchEvent(new Event('scroll'));

      expect(cursor.updateCaret).toHaveBeenCalled();
      expect(cursor.setSelectionRange).not.toHaveBeenCalled();
    });

    it('updates selections on update()', () => {
      const cursors = new QuillCursors(quill);
      const cursor = cursors.createCursor('xyz', 'Joe Bloggs', 'blue');
      cursor.range = {index: 0, length: 1};
      jest.spyOn(quill, 'getLeaf').mockReturnValue([{domNode: document.createTextNode('foo')}, 0]);
      jest.spyOn(quill, 'getBounds').mockReturnValue({top: 0, left: 0, width: 0, height: 0});
      jest.spyOn(cursor, 'setSelectionRange');

      cursors.update();

      expect(cursor.setSelectionRange).toHaveBeenCalled();
    });

    it('warns when the Highlight API is unsupported', () => {
      const warn = jest.spyOn(CursorHighlight, 'warnIfUnsupported').mockImplementation();
      try {
        new QuillCursors(quill);
        expect(warn).toHaveBeenCalledTimes(1);
      } finally {
        warn.mockRestore();
      }
    });
  });

  describe('ResizeObserver', () => {
    let cursors: QuillCursors;
    let editor: HTMLElement;

    beforeEach(() => {
      cursors = new QuillCursors(quill);
      cursors.createCursor('abc', 'Jane Bloggs', 'red');
      cursors.moveCursor('abc', {index: 0, length: 0});
      editor = quill.root;
    });

    it('registers a ResizeObserver', () => {
      expect(mockObserver).toHaveBeenCalledTimes(1);
      expect(mockObserver).toHaveBeenCalledWith(editor);

      expect(ResizeObserverMock).toHaveBeenCalledTimes(1);
      const callback = ResizeObserverMock.mock.calls[0][0];
      const cursor = cursors.cursors()[0];
      cursor.range = {index: 0, length: 1};
      jest.spyOn(quill, 'getLeaf').mockReturnValue([{domNode: document.createTextNode('foo')}, 0]);
      jest.spyOn(quill, 'getBounds').mockReturnValue({top: 0, left: 0, width: 0, height: 0});
      jest.spyOn(cursor, 'updateCaret');
      jest.spyOn(cursor, 'setSelectionRange');
      callback([{target: {isConnected: true}}]);
      expect(cursor.updateCaret).toHaveBeenCalled();
      expect(cursor.setSelectionRange).not.toHaveBeenCalled();
    });

    it('disconnects and reconnects the observer if the cursors are updated again', () => {
      mockObserver.mockReset();
      const callback = ResizeObserverMock.mock.calls[0][0];
      callback([{target: {isConnected: false}}]);
      expect(mockDisconnect).toHaveBeenCalledTimes(1);

      cursors.moveCursor('abc', {index: 1, length: 0});
      expect(mockObserver).toHaveBeenCalledTimes(1);
    });

    it('does not disconnect if the node is still connected', () => {
      const callback = ResizeObserverMock.mock.calls[0][0];
      callback([{target: {isConnected: true}}]);
      expect(mockDisconnect).toHaveBeenCalledTimes(0);
    });
  });

  describe('text change listener', () => {
    let listeners: any;

    beforeEach(() => {
      listeners = {};

      jest.spyOn(quill, 'on').mockImplementation(((event: string, callback: Function) => {
        listeners[event] = callback;
      }) as any);

      jest.spyOn(quill.emitter, 'emit');

      jest.spyOn(quill, 'getSelection').mockReturnValue({index: 0, length: 0});
    });

    it('registers the text change listener', () => {
      new QuillCursors(quill);
      expect(listeners['text-change']).toBeTruthy();
    });

    it('does not emit a selection change event if setting the source to null', () => {
      jest.useFakeTimers();
      new QuillCursors(quill, {selectionChangeSource: null});

      listeners['text-change']();
      jest.runAllTimers();

      expect(quill.emitter.emit).not.toHaveBeenCalled();
    });

    it('emits the selection on text change', () => {
      jest.useFakeTimers();
      new QuillCursors(quill);

      jest.spyOn(quill, 'getSelection').mockReturnValue({index: 10, length: 10});
      listeners['text-change']();
      jest.runAllTimers();

      expect(quill.emitter.emit).toHaveBeenCalledTimes(1);
      expect(quill.emitter.emit).toHaveBeenCalledWith(
        'selection-change',
        {index: 10, length: 10},
        {index: 0, length: 0},
        'api',
      );
    });

    it('emits a custom source for selection-change on text change', () => {
      jest.useFakeTimers();
      new QuillCursors(quill, {selectionChangeSource: 'quill-cursors'});

      jest.spyOn(quill, 'getSelection').mockReturnValue({index: 10, length: 10});
      listeners['text-change']();
      jest.runAllTimers();

      expect(quill.emitter.emit).toHaveBeenCalledTimes(1);
      expect(quill.emitter.emit).toHaveBeenCalledWith(
        'selection-change',
        {index: 10, length: 10},
        {index: 0, length: 0},
        'quill-cursors',
      );
    });

    it('transforms an existing cursor after an insertion', () => {
      jest.useFakeTimers();
      const cursors = new QuillCursors(quill, {transformOnTextChange: true});
      const cursor = cursors.createCursor('abc', 'Joe Bloggs', 'red');
      cursors.moveCursor('abc', {index: 10, length: 5});

      const delta = [
        {retain: 5},
        {insert: 'foo'},
      ];
      listeners['text-change'](delta);
      jest.runAllTimers();

      expect(cursor.range).toEqual({index: 13, length: 5});
    });
  });

  describe('tracking current selection', () => {
    let listeners: any;

    beforeEach(() => {
      listeners = {};

      jest.spyOn(quill, 'on').mockImplementation(((event: string, callback: Function) => {
        listeners[event] = callback;
      }) as any);

      jest.spyOn(quill.emitter, 'emit').mockImplementation(((event: string, ...args: any[]) => {
        const callback = listeners[event];
        callback(...args);
      }) as any);

      jest.spyOn(quill, 'getSelection').mockReturnValue({index: 0, length: 0});
    });

    it('updates the current selection on text change', () => {
      jest.useFakeTimers();
      new QuillCursors(quill);

      jest.spyOn(quill, 'getSelection').mockReturnValue({index: 10, length: 10});
      quill.emitter.emit('text-change');
      jest.runAllTimers();

      expect(quill.emitter.emit).toHaveBeenCalledWith(
        'selection-change',
        {index: 10, length: 10},
        {index: 0, length: 0},
        'api',
      );

      jest.spyOn(quill, 'getSelection').mockReturnValue({index: 20, length: 20});
      quill.emitter.emit('text-change');
      jest.runAllTimers();

      expect(quill.emitter.emit).toHaveBeenCalledWith(
        'selection-change',
        {index: 20, length: 20},
        {index: 10, length: 10},
        'api',
      );
    });
  });

  describe('creating a cursor', () => {
    it('creates a cursor', () => {
      const cursors = new QuillCursors(quill);
      expect(cursors.cursors()).toHaveLength(0);

      cursors.createCursor('abc', 'Joe Bloggs', 'red');
      expect(cursors.cursors()).toHaveLength(1);
    });

    it('only creates a cursor with a given ID once', () => {
      const cursors = new QuillCursors(quill);
      expect(cursors.cursors()).toHaveLength(0);

      cursors.createCursor('abc', 'Joe Bloggs', 'red');
      cursors.createCursor('abc', 'Joe Bloggs', 'red');
      expect(cursors.cursors()).toHaveLength(1);
    });

    it('adds the cursor to the DOM', () => {
      const cursors = new QuillCursors(quill);
      const cursorsContainer = quill.container.getElementsByClassName('ql-cursors')[0];

      expect(cursorsContainer.childElementCount).toBe(0);

      cursors.createCursor('abc', 'Joe Bloggs', 'red');
      expect(cursorsContainer.childElementCount).toBe(1);
    });

    it('can override the hide delay and speed', () => {
      const cursors = new QuillCursors(quill, {
        hideDelayMs: 1000,
        hideSpeedMs: 2000,
      });

      cursors.createCursor('abc', 'Jane Bloggs', 'red');

      const flag = quill.container.getElementsByClassName(Cursor.FLAG_CLASS)[0];
      expect(flag).toHaveStyle('transition-delay: 1000ms');
      expect(flag).toHaveStyle('transition-duration: 2000ms');
    });

    it('can override the Quill container class', () => {
      new QuillCursors(quill, {containerClass: 'my-class'});
      const containers = quill.container.getElementsByClassName('my-class');
      expect(containers.length).toBe(1);
    });
  });

  describe('moving a cursor', () => {
    it('updates the cursor range', () => {
      const cursors = new QuillCursors(quill);
      const cursor = cursors.createCursor('abc', 'Jane Bloggs', 'red');
      expect(cursor.range).toBeFalsy();

      cursors.moveCursor('abc', {index: 0, length: 0});
      expect(cursor.range).toEqual({index: 0, length: 0});
    });

    it('does not throw if the cursor does not exist', () => {
      const cursors = new QuillCursors(quill);
      expect(() => cursors.moveCursor('abc', null)).not.toThrow();
    });
  });

  describe('removing a cursor', () => {
    let cursors: QuillCursors;
    let cursor: Cursor;

    beforeEach(() => {
      cursors = new QuillCursors(quill);
      cursor = cursors.createCursor('abc', 'Joe Bloggs', 'red');
    });

    it('removes the cursor from the DOM', () => {
      const cursorsContainer = quill.container.getElementsByClassName('ql-cursors')[0];

      expect(cursorsContainer.childElementCount).toBe(1);
      expect(cursors.cursors()).toHaveLength(1);

      cursors.removeCursor(cursor.id);

      expect(cursorsContainer.childElementCount).toBe(0);
      expect(cursors.cursors()).toHaveLength(0);
    });

    it('clears cursors', () => {
      const cursorsContainer = quill.container.getElementsByClassName('ql-cursors')[0];

      expect(cursorsContainer.childElementCount).toBe(1);
      expect(cursors.cursors()).toHaveLength(1);

      cursors.clearCursors();

      expect(cursorsContainer.childElementCount).toBe(0);
      expect(cursors.cursors()).toHaveLength(0);
    });

    it('does not throw if the cursor does not exist', () => {
      expect(() => cursors.removeCursor('not-an-id')).not.toThrow();
    });
  });

  describe('updating cursors', () => {
    let cursors: QuillCursors;
    let cursor: Cursor;
    let mockRange: any;

    beforeEach(() => {
      cursors = new QuillCursors(quill);
      cursor = cursors.createCursor('abc', 'Joe Bloggs', 'red');

      jest.spyOn(quill, 'getBounds').mockReturnValue({
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      });

      mockRange = {
        collapsed: false,
        setStart: () => { },
        setStartBefore: () => { },
        setEnd: () => { },
        setEndAfter: () => { },
        getBoundingClientRect: () => ({}),
      };
      document.createRange = () => mockRange;
    });

    it('hides a cursor with no range', () => {
      jest.spyOn(cursor, 'hide');
      jest.spyOn(cursor, 'show');
      cursors.moveCursor(cursor.id, null);

      expect(cursor.hide).toHaveBeenCalled();
      expect(cursor.show).not.toHaveBeenCalled();
    });

    it('hides a cursor with no range if the range is updated manually', () => {
      jest.spyOn(cursor, 'hide');
      jest.spyOn(cursor, 'show');
      cursor.range = null;

      expect(cursor.hide).not.toHaveBeenCalled();
      cursors.update();

      expect(cursor.hide).toHaveBeenCalled();
      expect(cursor.show).not.toHaveBeenCalled();
    });

    it('hides a cursor with a range, but no valid leaf', () => {
      jest.spyOn(cursor, 'hide');
      jest.spyOn(cursor, 'show');
      jest.spyOn(quill, 'getLeaf').mockReturnValue(null);
      cursors.moveCursor(cursor.id, {index: 0, length: 0});

      expect(cursor.hide).toHaveBeenCalled();
      expect(cursor.show).not.toHaveBeenCalled();
    });

    it('shows a cursor with a valid range and leaf', () => {
      jest.spyOn(cursor, 'hide');
      jest.spyOn(cursor, 'show');
      jest.spyOn(quill, 'getLeaf').mockReturnValue(createLeaf());
      cursors.moveCursor(cursor.id, {index: 0, length: 0});

      expect(cursor.hide).not.toHaveBeenCalled();
      expect(cursor.show).toHaveBeenCalled();
    });

    it('forces ranges into the Quill bounds', () => {
      jest.spyOn(quill, 'getLength').mockReturnValue(10);
      jest.spyOn(quill, 'getLeaf');

      cursors.moveCursor(cursor.id, {index: -10, length: 100});

      expect(quill.getLeaf).toHaveBeenCalledWith(0);
      expect(quill.getLeaf).toHaveBeenCalledWith(9);
    });

    it('sets the highlight range on the start and end leaves', () => {
      const startIndex = 0;
      const endIndex = 2;
      const startLeaf = createLeaf();
      const endLeaf = createLeaf();
      jest.spyOn(quill, 'getLeaf').mockImplementation(((index: number) => {
        switch (index) {
          case startIndex:
            return startLeaf;
          case endIndex:
            return endLeaf;
          default:
            return null;
        }
      }) as any);
      jest.spyOn(mockRange, 'setStart');
      jest.spyOn(mockRange, 'setEnd');

      cursors.moveCursor(cursor.id, {index: startIndex, length: endIndex - startIndex});

      expect(mockRange.setStart).toHaveBeenCalledWith(startLeaf[0].domNode, startLeaf[1]);
      expect(mockRange.setEnd).toHaveBeenCalledWith(endLeaf[0].domNode, endLeaf[1]);

      const registered: any = (CSS as any).highlights.get(cursor.highlightName);
      expect(registered.has(mockRange)).toBe(true);
    });

    it('sets the range on either side of an embed element', () => {
      const leaf = createLeaf('img');
      jest.spyOn(quill, 'getLeaf').mockImplementation(() => leaf);
      jest.spyOn(mockRange, 'setStartBefore');
      jest.spyOn(mockRange, 'setEndAfter');

      cursors.moveCursor(cursor.id, {index: 0, length: 1});

      expect(mockRange.setStartBefore).toHaveBeenCalledWith(leaf[0].domNode);
      expect(mockRange.setEndAfter).toHaveBeenCalledWith(leaf[0].domNode);
    });

    it('clears the highlight for a collapsed cursor', () => {
      jest.spyOn(quill, 'getLeaf').mockReturnValue(createLeaf());
      jest.spyOn(cursor, 'setSelectionRange');

      cursors.moveCursor(cursor.id, {index: 0, length: 0});

      expect(cursor.setSelectionRange).toHaveBeenCalledWith(null);
    });

    it('clears the highlight when the built range is collapsed', () => {
      jest.spyOn(quill, 'getLeaf').mockReturnValue(createLeaf());
      jest.spyOn(cursor, 'setSelectionRange');
      mockRange.collapsed = true;

      cursors.moveCursor(cursor.id, {index: 0, length: 1});

      expect(cursor.setSelectionRange).toHaveBeenCalledWith(null);
    });

    describe('RTL positioning', () => {
      it('adjusts caret to right edge of character for RTL at start/middle position', () => {
        const parentElement = document.createElement('span');
        parentElement.style.direction = 'rtl';
        const textNode = document.createTextNode('שלום');
        parentElement.appendChild(textNode);

        jest.spyOn(quill, 'getLeaf').mockReturnValue([{domNode: textNode}, 0]);
        jest.spyOn(quill, 'getBounds').mockReturnValue({
          top: 10, left: 100, width: 0, height: 20,
        });
        jest.spyOn(quill.container, 'getBoundingClientRect').mockReturnValue({
          left: 50, top: 0, width: 600, height: 400, right: 650, bottom: 400,
        });

        const charRange = {
          setStart: jest.fn(), setEnd: jest.fn(),
          getBoundingClientRect: () => ({
            left: 250, right: 260, width: 10, top: 10, height: 20, bottom: 30,
          }),
        };
        document.createRange = () => charRange as any;

        jest.spyOn(cursor, 'updateCaret');
        cursors.moveCursor(cursor.id, {index: 0, length: 0});

        expect(cursor.updateCaret).toHaveBeenCalledWith(
          expect.objectContaining({left: 210}),
          expect.anything(),
        );
      });

      it('adjusts caret to left edge of character for RTL at end-of-text position', () => {
        const parentElement = document.createElement('span');
        parentElement.style.direction = 'rtl';
        const textNode = document.createTextNode('שלום');
        parentElement.appendChild(textNode);

        jest.spyOn(quill, 'getLeaf').mockReturnValue([{domNode: textNode}, 4]);
        jest.spyOn(quill, 'getBounds').mockReturnValue({
          top: 10, left: 120, width: 0, height: 20,
        });
        jest.spyOn(quill.container, 'getBoundingClientRect').mockReturnValue({
          left: 50, top: 0, width: 600, height: 400, right: 650, bottom: 400,
        });

        const charRange = {
          setStart: jest.fn(), setEnd: jest.fn(),
          getBoundingClientRect: () => ({
            left: 150, right: 160, width: 10, top: 10, height: 20, bottom: 30,
          }),
        };
        document.createRange = () => charRange as any;

        jest.spyOn(cursor, 'updateCaret');
        cursors.moveCursor(cursor.id, {index: 0, length: 0});

        expect(cursor.updateCaret).toHaveBeenCalledWith(
          expect.objectContaining({left: 100}),
          expect.anything(),
        );
      });

      it('does not adjust bounds for LTR text', () => {
        const parentElement = document.createElement('span');
        parentElement.style.direction = 'ltr';
        const textNode = document.createTextNode('hello');
        parentElement.appendChild(textNode);

        jest.spyOn(quill, 'getLeaf').mockReturnValue([{domNode: textNode}, 0]);
        jest.spyOn(quill, 'getBounds').mockReturnValue({
          top: 10, left: 100, width: 0, height: 20,
        });
        jest.spyOn(cursor, 'updateCaret');

        cursors.moveCursor(cursor.id, {index: 0, length: 0});

        expect(cursor.updateCaret).toHaveBeenCalledWith(
          expect.objectContaining({left: 100}),
          expect.anything(),
        );
      });

      it('defaults to LTR when leaf has no parent element', () => {
        jest.spyOn(quill, 'getLeaf').mockReturnValue(createLeaf());
        jest.spyOn(quill, 'getBounds').mockReturnValue({
          top: 10, left: 100, width: 0, height: 20,
        });
        jest.spyOn(cursor, 'updateCaret');

        cursors.moveCursor(cursor.id, {index: 0, length: 0});

        expect(cursor.updateCaret).toHaveBeenCalledWith(
          expect.objectContaining({left: 100}),
          expect.anything(),
        );
      });

      it('detects RTL via CSS when no dir attribute is present', () => {
        const parentElement = document.createElement('span');
        parentElement.style.direction = 'rtl';
        const textNode = document.createTextNode('שלום');
        parentElement.appendChild(textNode);

        jest.spyOn(quill, 'getLeaf').mockReturnValue([{domNode: textNode}, 0]);
        jest.spyOn(quill, 'getBounds').mockReturnValue({
          top: 10, left: 100, width: 0, height: 20,
        });
        jest.spyOn(quill.container, 'getBoundingClientRect').mockReturnValue({
          left: 50, top: 0, width: 600, height: 400, right: 650, bottom: 400,
        });

        const charRange = {
          setStart: jest.fn(), setEnd: jest.fn(),
          getBoundingClientRect: () => ({
            left: 250, right: 260, width: 10, top: 10, height: 20, bottom: 30,
          }),
        };
        document.createRange = () => charRange as any;

        jest.spyOn(cursor, 'updateCaret');
        cursors.moveCursor(cursor.id, {index: 0, length: 0});

        expect(cursor.updateCaret).toHaveBeenCalledWith(
          expect.objectContaining({left: 210}),
          expect.anything(),
        );
      });

      it('does not adjust bounds for RTL non-text leaf nodes', () => {
        const parentElement = document.createElement('span');
        parentElement.style.direction = 'rtl';
        const img = document.createElement('img');
        parentElement.appendChild(img);

        jest.spyOn(quill, 'getLeaf').mockReturnValue([{domNode: img}, 0]);
        jest.spyOn(quill, 'getBounds').mockReturnValue({
          top: 10, left: 100, width: 0, height: 20,
        });
        jest.spyOn(cursor, 'updateCaret');

        cursors.moveCursor(cursor.id, {index: 0, length: 0});

        expect(cursor.updateCaret).toHaveBeenCalledWith(
          expect.objectContaining({left: 100}),
          expect.anything(),
        );
      });

      it('detects RTL via inherited direction from ancestor', () => {
        const container = document.createElement('div');
        const parentElement = document.createElement('span');
        container.appendChild(parentElement);
        const textNode = document.createTextNode('שלום');
        parentElement.appendChild(textNode);

        const originalGetComputedStyle = window.getComputedStyle;
        jest.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
          const style = originalGetComputedStyle(el);
          if (el === parentElement) {
            return {...style, direction: 'rtl'} as CSSStyleDeclaration;
          }
          return style;
        });

        jest.spyOn(quill, 'getLeaf').mockReturnValue([{domNode: textNode}, 0]);
        jest.spyOn(quill, 'getBounds').mockReturnValue({
          top: 10, left: 100, width: 0, height: 20,
        });
        jest.spyOn(quill.container, 'getBoundingClientRect').mockReturnValue({
          left: 50, top: 0, width: 600, height: 400, right: 650, bottom: 400,
        });

        const charRange = {
          setStart: jest.fn(), setEnd: jest.fn(),
          getBoundingClientRect: () => ({
            left: 250, right: 260, width: 10, top: 10, height: 20, bottom: 30,
          }),
        };
        document.createRange = () => charRange as any;

        jest.spyOn(cursor, 'updateCaret');
        cursors.moveCursor(cursor.id, {index: 0, length: 0});

        expect(cursor.updateCaret).toHaveBeenCalledWith(
          expect.objectContaining({left: 210}),
          expect.anything(),
        );
      });

      it('respects LTR override inside RTL ancestor', () => {
        const container = document.createElement('div');
        const parentElement = document.createElement('span');
        parentElement.style.direction = 'ltr';
        container.appendChild(parentElement);
        const textNode = document.createTextNode('hello');
        parentElement.appendChild(textNode);

        jest.spyOn(quill, 'getLeaf').mockReturnValue([{domNode: textNode}, 0]);
        jest.spyOn(quill, 'getBounds').mockReturnValue({
          top: 10, left: 100, width: 0, height: 20,
        });
        jest.spyOn(cursor, 'updateCaret');

        cursors.moveCursor(cursor.id, {index: 0, length: 0});

        expect(cursor.updateCaret).toHaveBeenCalledWith(
          expect.objectContaining({left: 100}),
          expect.anything(),
        );
      });

      it('respects RTL override inside LTR ancestor', () => {
        const parentElement = document.createElement('span');
        parentElement.style.direction = 'rtl';
        const textNode = document.createTextNode('שלום');
        parentElement.appendChild(textNode);

        jest.spyOn(quill, 'getLeaf').mockReturnValue([{domNode: textNode}, 0]);
        jest.spyOn(quill, 'getBounds').mockReturnValue({
          top: 10, left: 100, width: 0, height: 20,
        });
        jest.spyOn(quill.container, 'getBoundingClientRect').mockReturnValue({
          left: 50, top: 0, width: 600, height: 400, right: 650, bottom: 400,
        });

        const charRange = {
          setStart: jest.fn(), setEnd: jest.fn(),
          getBoundingClientRect: () => ({
            left: 250, right: 260, width: 10, top: 10, height: 20, bottom: 30,
          }),
        };
        document.createRange = () => charRange as any;

        jest.spyOn(cursor, 'updateCaret');
        cursors.moveCursor(cursor.id, {index: 0, length: 0});

        expect(cursor.updateCaret).toHaveBeenCalledWith(
          expect.objectContaining({left: 210}),
          expect.anything(),
        );
      });
    });
  });

  describe('flag', () => {
    it('toggles the flag of a cursor', () => {
      const cursors = new QuillCursors(quill);
      cursors.createCursor('abc', 'Joe Bloggs', 'red');

      const container = quill.container.getElementsByClassName(Cursor.CARET_CONTAINER_CLASS)[0];
      expect(container).not.toHaveClass(Cursor.CONTAINER_HOVER_CLASS);
      cursors.toggleFlag('abc', true);
      expect(container).toHaveClass(Cursor.CONTAINER_HOVER_CLASS);
    });

    it('does not throw if the cursor does not exist', () => {
      const cursors = new QuillCursors(quill);
      expect(() => cursors.toggleFlag('abc')).not.toThrow();
    });

    describe('touch', () => {
      it('toggles near flags by touchstart event', () => {
        const cursors = new QuillCursors(quill);
        cursors.createCursor('abc', 'Iron Man', 'red');

        const cursor = cursors.cursors()[0];
        jest.spyOn(cursor, 'toggleNearCursor');

        const touch = new TouchEvent('touchstart');
        const editor = quill.root;
        editor.dispatchEvent(touch);
        expect(cursor.toggleNearCursor).toBeCalled();
      });

      it('hide flags after 2 secs', () => {
        jest.useFakeTimers();
        const cursors = new QuillCursors(quill);
        cursors.createCursor('abc', 'Iron Man', 'red');

        const cursor = cursors.cursors()[0];
        jest.spyOn(cursor, 'toggleNearCursor');
        jest.spyOn(cursor, 'toggleFlag');

        const touch = new TouchEvent('touchstart');
        const editor = quill.root;
        editor.dispatchEvent(touch);
        expect(cursor.toggleNearCursor).toBeCalled();

        jest.runAllTimers();

        expect(cursor.toggleFlag).toBeCalled();
      });
    });
  });

  describe('destroy', () => {
    let cursors: QuillCursors;
    let editor: HTMLElement;

    beforeEach(() => {
      cursors = new QuillCursors(quill);
      editor = quill.root;
    });

    it('removes the container from the DOM', () => {
      cursors.destroy();
      expect(quill.container.querySelector('.ql-cursors')).toBeNull();
    });

    it('does not throw when container is already detached from the DOM', () => {
      const container = quill.container.querySelector('.ql-cursors');
      container.parentNode.removeChild(container);
      expect(() => cursors.destroy()).not.toThrow();
    });

    it('removes the scroll listener', () => {
      jest.spyOn(editor, 'removeEventListener');
      cursors.destroy();
      expect(editor.removeEventListener).toHaveBeenCalledWith('scroll', expect.anything());
    });

    it('removes the touchstart listener', () => {
      jest.spyOn(editor, 'removeEventListener');
      cursors.destroy();
      expect(editor.removeEventListener).toHaveBeenCalledWith('touchstart', expect.anything());
    });

    it('does not toggle cursor flags when touchstart fires after destroy', () => {
      jest.useFakeTimers();
      const cursor = cursors.createCursor('abc', 'Jane', 'red');
      jest.spyOn(cursor, 'toggleNearCursor');
      cursors.destroy();
      editor.dispatchEvent(new TouchEvent('touchstart'));
      jest.runAllTimers();
      expect(cursor.toggleNearCursor).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('disconnects ResizeObserver when one exists', () => {
      cursors.createCursor('abc', 'Jane', 'red');
      cursors.moveCursor('abc', {index: 0, length: 0});
      mockDisconnect.mockClear();
      cursors.destroy();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it('does not throw when no ResizeObserver exists', () => {
      expect(() => cursors.destroy()).not.toThrow();
    });

    it('calls quill.off for TEXT_CHANGE', () => {
      jest.spyOn(quill, 'off');
      cursors.destroy();
      expect(quill.off).toHaveBeenCalledWith('text-change', expect.anything());
    });

    it('calls quill.off for SELECTION_CHANGE', () => {
      jest.spyOn(quill, 'off');
      cursors.destroy();
      expect(quill.off).toHaveBeenCalledWith('selection-change', expect.anything());
    });

    it('removes all cursors', () => {
      cursors.createCursor('abc', 'Jane', 'red');
      cursors.createCursor('def', 'John', 'blue');
      expect(cursors.cursors()).toHaveLength(2);
      cursors.destroy();
      expect(cursors.cursors()).toHaveLength(0);
    });

    it('does not emit selection change when destroyed before pending text-change timer fires', () => {
      jest.useFakeTimers();
      const listeners: any = {};
      jest.spyOn(quill, 'on').mockImplementation(((event: string, callback: Function) => {
        listeners[event] = callback;
      }) as any);
      jest.spyOn(quill.emitter, 'emit');

      const localCursors = new QuillCursors(quill);
      listeners['text-change']({});
      localCursors.destroy();
      jest.runAllTimers();

      expect(quill.emitter.emit).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('does not transform cursors when destroyed before pending text-change timer fires', () => {
      jest.useFakeTimers();
      const listeners: any = {};
      jest.spyOn(quill, 'on').mockImplementation(((event: string, callback: Function) => {
        listeners[event] = callback;
      }) as any);

      const localCursors = new QuillCursors(quill, {transformOnTextChange: true, selectionChangeSource: null});
      const cursor = localCursors.createCursor('abc', 'Jane', 'red');
      cursor.range = {index: 5, length: 0};
      listeners['text-change']({ops: [{retain: 3}, {insert: 'x'}]});
      localCursors.destroy();
      jest.runAllTimers();

      expect(cursor.range.index).toBe(5);
      jest.useRealTimers();
    });

    it('is idempotent — calling destroy twice does not throw or repeat cleanup', () => {
      jest.spyOn(quill, 'off');
      cursors.destroy();
      const callsAfterFirst = (quill.off as jest.Mock).mock.calls.length;
      expect(() => cursors.destroy()).not.toThrow();
      expect((quill.off as jest.Mock).mock.calls.length).toBe(callsAfterFirst);
    });

    it('cancels pending touchstart timers', () => {
      jest.useFakeTimers();
      const cursor = cursors.createCursor('abc', 'Jane', 'red');
      jest.spyOn(cursor, 'toggleFlag');
      editor.dispatchEvent(new TouchEvent('touchstart'));
      cursors.destroy();
      jest.runAllTimers();
      expect(cursor.toggleFlag).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('ignores moveCursor calls after destroy', () => {
      cursors.createCursor('abc', 'Jane', 'red');
      cursors.destroy();
      expect(() => cursors.moveCursor('abc', {index: 0, length: 0})).not.toThrow();
    });

    it('ignores update calls after destroy', () => {
      cursors.createCursor('abc', 'Jane', 'red');
      cursors.destroy();
      expect(() => cursors.update()).not.toThrow();
    });

    it('ignores toggleFlag calls after destroy', () => {
      cursors.createCursor('abc', 'Jane', 'red');
      cursors.destroy();
      expect(() => cursors.toggleFlag('abc', true)).not.toThrow();
    });

    it('ignores removeCursor calls after destroy', () => {
      cursors.createCursor('abc', 'Jane', 'red');
      cursors.destroy();
      expect(() => cursors.removeCursor('abc')).not.toThrow();
    });

    it('ignores clearCursors calls after destroy', () => {
      cursors.createCursor('abc', 'Jane', 'red');
      cursors.destroy();
      expect(() => cursors.clearCursors()).not.toThrow();
    });

    describe('auto-teardown via Quill.find', () => {
      it('forwards events to handler when Quill.find returns the instance', () => {
        const listeners: any = {};
        jest.spyOn(quill, 'on').mockImplementation(((event: string, cb: Function) => {
          listeners[event] = cb;
        }) as any);
        quill.constructor.find.mockReturnValue(quill);

        const localCursors = new QuillCursors(quill);
        jest.spyOn(localCursors as any, '_handleTextChange');
        listeners['text-change']({ops: []});

        expect((localCursors as any)._handleTextChange).toHaveBeenCalledWith({ops: []});
      });

      it('calls destroy when Quill.find returns null', () => {
        const listeners: any = {};
        jest.spyOn(quill, 'on').mockImplementation(((event: string, cb: Function) => {
          listeners[event] = cb;
        }) as any);
        quill.constructor.find.mockReturnValue(null);

        const localCursors = new QuillCursors(quill);
        jest.spyOn(localCursors, 'destroy');
        listeners['text-change']({ops: []});

        expect(localCursors.destroy).toHaveBeenCalled();
      });

      it('does not forward events after Quill.find returns null', () => {
        const listeners: any = {};
        jest.spyOn(quill, 'on').mockImplementation(((event: string, cb: Function) => {
          listeners[event] = cb;
        }) as any);
        quill.constructor.find.mockReturnValue(null);

        const localCursors = new QuillCursors(quill);
        jest.spyOn(localCursors as any, '_handleTextChange');
        listeners['text-change']({ops: []});

        expect((localCursors as any)._handleTextChange).not.toHaveBeenCalled();
      });

      it('explicit destroy removes all quill listeners via _quillListeners loop', () => {
        jest.spyOn(quill, 'off');
        const localCursors = new QuillCursors(quill);
        localCursors.destroy();

        expect(quill.off).toHaveBeenCalledWith('text-change', expect.anything());
        expect(quill.off).toHaveBeenCalledWith('selection-change', expect.anything());
      });

      it('calls destroy when Quill.find returns null on selection-change', () => {
        const listeners: any = {};
        jest.spyOn(quill, 'on').mockImplementation(((event: string, cb: Function) => {
          listeners[event] = cb;
        }) as any);
        jest.spyOn(quill, 'off');
        quill.constructor.find.mockReturnValue(null);

        const localCursors = new QuillCursors(quill);
        jest.spyOn(localCursors, 'destroy');
        listeners['selection-change'](null);

        expect(localCursors.destroy).toHaveBeenCalled();
      });

      it('does not forward selection-change events after Quill.find returns null', () => {
        const listeners: any = {};
        jest.spyOn(quill, 'on').mockImplementation(((event: string, cb: Function) => {
          listeners[event] = cb;
        }) as any);
        quill.constructor.find.mockReturnValue(null);

        const localCursors = new QuillCursors(quill);
        const initialSelection = (localCursors as any)._currentSelection;
        listeners['selection-change']({index: 5, length: 0});

        expect((localCursors as any)._currentSelection).toBe(initialSelection);
      });

      it('clears _quillListeners after explicit destroy', () => {
        const localCursors = new QuillCursors(quill);
        expect((localCursors as any)._quillListeners).toHaveLength(2);
        localCursors.destroy();
        expect((localCursors as any)._quillListeners).toHaveLength(0);
      });
    });

    describe('_addDomListener', () => {
      it('does not fire scroll handler when quill.constructor.find returns null', () => {
        quill.constructor.find.mockReturnValue(null);
        const localCursors = new QuillCursors(quill);
        jest.spyOn(localCursors as any, '_updateCaretPositions');
        editor.dispatchEvent(new Event('scroll'));
        expect((localCursors as any)._updateCaretPositions).not.toHaveBeenCalled();
      });

      it('calls destroy and removes the DOM listener when quill.constructor.find returns null on scroll', () => {
        quill.constructor.find.mockReturnValue(null);
        const localCursors = new QuillCursors(quill);
        jest.spyOn(localCursors, 'destroy');
        const removeListenerSpy = jest.spyOn(editor, 'removeEventListener');
        editor.dispatchEvent(new Event('scroll'));
        expect(localCursors.destroy).toHaveBeenCalled();
        expect(removeListenerSpy).toHaveBeenCalledWith('scroll', expect.anything());
      });

      it('does not fire touchstart handler when quill.constructor.find returns null', () => {
        quill.constructor.find.mockReturnValue(null);
        const localCursors = new QuillCursors(quill);
        const cursor = localCursors.createCursor('abc', 'Jane', 'red');
        jest.spyOn(cursor, 'toggleNearCursor');
        editor.dispatchEvent(new TouchEvent('touchstart'));
        expect(cursor.toggleNearCursor).not.toHaveBeenCalled();
      });

      it('clears _domListeners after explicit destroy', () => {
        const localCursors = new QuillCursors(quill);
        expect((localCursors as any)._domListeners.length).toBeGreaterThan(0);
        localCursors.destroy();
        expect((localCursors as any)._domListeners).toHaveLength(0);
      });
    });
  });

  function createLeaf(tag?: string): any[] {
    const domNode = tag ? document.createElement(tag) : document.createTextNode('');
    return [{domNode}, 0];
  }
});
