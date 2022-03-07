import QuillCursors from './quill-cursors';
import Cursor from './cursor';
import '@testing-library/jest-dom/extend-expect';
import ResizeObserver from 'resize-observer-polyfill';

const mockObserver = jest.fn();
const mockDisconnect = jest.fn();
jest.mock('resize-observer-polyfill', () => {
  return jest.fn().mockImplementation(() => {
    return {
      observe: mockObserver,
      disconnect: mockDisconnect,
    };
  });
});

describe('QuillCursors', () => {
  let quill: any;

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
      getLines: (): any[] => [],
      on: (): void => {},
    };

    quill.container = document.createElement('DIV');
    document.body.appendChild(quill.container);

    const editor = document.createElement('DIV');
    editor.classList.add('ql-editor');
    quill.container.appendChild(editor);

    (ResizeObserver as any).mockClear();
    mockObserver.mockClear();
    mockDisconnect.mockClear();
  });

  describe('initialisation', () => {
    it('adds a container to Quill', () => {
      jest.spyOn(quill, 'addContainer');
      new QuillCursors(quill);
      expect(quill.addContainer).toHaveBeenCalledTimes(1);
    });

    it('registers a scroll listener', () => {
      const editor = quill.container.getElementsByClassName('ql-editor')[0];
      jest.spyOn(editor, 'addEventListener');
      const cursors = new QuillCursors(quill);
      expect(editor.addEventListener).toHaveBeenCalledWith('scroll', expect.anything());

      jest.spyOn(cursors, 'update');
      const scroll = new Event('scroll');
      editor.dispatchEvent(scroll);
      expect(cursors.update).toHaveBeenCalled();
    });
  });

  describe('ResizeObserver', () => {
    let cursors: QuillCursors;
    let editor: HTMLElement;

    beforeEach(() => {
      cursors = new QuillCursors(quill);
      cursors.createCursor('abc', 'Jane Bloggs', 'red');
      cursors.moveCursor('abc', {index: 0, length: 0});
      editor = quill.container.getElementsByClassName('ql-editor')[0];
    });

    it('registers a ResizeObserver', () => {
      expect(mockObserver).toHaveBeenCalledTimes(1);
      expect(mockObserver).toHaveBeenCalledWith(editor);

      expect(ResizeObserver).toHaveBeenCalledTimes(1);
      const callback = (ResizeObserver as any).mock.calls[0][0];
      jest.spyOn(cursors, 'update');
      callback([{target: {}}]);
      expect(cursors.update).toHaveBeenCalledTimes(1);
    });

    it('disconnects and reconnects the observer if the cursors are updated again', () => {
      mockObserver.mockReset();
      const callback = (ResizeObserver as any).mock.calls[0][0];
      callback([{target: {isConnected: false}}]);
      expect(mockDisconnect).toHaveBeenCalledTimes(1);

      cursors.moveCursor('abc', {index: 1, length: 0});
      expect(mockObserver).toHaveBeenCalledTimes(1);
    });

    it('does not disconnect if the node is still connected', () => {
      const callback = (ResizeObserver as any).mock.calls[0][0];
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
        setStart: () => { },
        setStartBefore: () => { },
        setEnd: () => { },
        setEndAfter: () => { },
        getClientRects: () => {
          const rectangles: any[] = [];
          return rectangles;
        },
        getBoundingClientRect: () => ({}),
        cloneRange: () => mockRange,
        selectNode: () => { },
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

    it('selects a block embed element', () => {
      const img = document.createElement('img');
      jest.spyOn(quill, 'getLeaf').mockReturnValue(createLeaf());
      jest.spyOn(quill, 'getLines').mockReturnValue([
        {domNode: img},
      ]);
      jest.spyOn(mockRange, 'selectNode');

      cursors.moveCursor(cursor.id, {index: 0, length: 0});

      expect(mockRange.selectNode).toHaveBeenCalledWith(img);
    });

    it('sets the range for a single line on the start and end leafs', () => {
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
      jest.spyOn(quill, 'getLines').mockReturnValue([{
        children: [],
      }]);
      jest.spyOn(mockRange, 'setStart');
      jest.spyOn(mockRange, 'setEnd');

      const range = {index: startIndex, length: endIndex - startIndex};

      cursors.moveCursor(cursor.id, range);

      expect(mockRange.setStart).toHaveBeenCalledWith(startLeaf[0].domNode, startLeaf[1]);
      expect(mockRange.setEnd).toHaveBeenCalledWith(endLeaf[0].domNode, endLeaf[1]);
    });

    it('sets the range for multiple lines based on the line path', () => {
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
      const line1Leaf = createLeaf();
      const line2Leaf = createLeaf();
      jest.spyOn(quill, 'getLines').mockReturnValue([
        {
          children: [],
          path: (): any[] => [line1Leaf],
          length: (): number => 1,
        },
        {
          children: [],
          path: (): any[] => [line2Leaf],
          length: (): number => 1,
        },
      ]);
      jest.spyOn(mockRange, 'setStart');
      jest.spyOn(mockRange, 'setEnd');

      const range = {index: startIndex, length: endIndex - startIndex};

      cursors.moveCursor(cursor.id, range);

      expect(mockRange.setStart).toHaveBeenCalledWith(startLeaf[0].domNode, startLeaf[1]);
      expect(mockRange.setEnd).toHaveBeenCalledWith(line1Leaf[0].domNode, line1Leaf[1]);

      expect(mockRange.setStart).toHaveBeenCalledWith(line2Leaf[0].domNode, line2Leaf[1]);
      expect(mockRange.setEnd).toHaveBeenCalledWith(line1Leaf[0].domNode, line1Leaf[1]);
    });

    it('sets the range on either side of an image', () => {
      const startIndex = 0;
      const endIndex = 1;
      const leaf = createLeaf('img');
      jest.spyOn(quill, 'getLeaf').mockImplementation(() => leaf);
      jest.spyOn(quill, 'getLines').mockReturnValue([{
        children: [],
      }]);
      jest.spyOn(mockRange, 'setStartBefore');
      jest.spyOn(mockRange, 'setEndAfter');

      const range = {index: startIndex, length: endIndex - startIndex};

      cursors.moveCursor(cursor.id, range);

      expect(mockRange.setStartBefore).toHaveBeenCalledWith(leaf[0].domNode);
      expect(mockRange.setEndAfter).toHaveBeenCalledWith(leaf[0].domNode);
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
        const editor = quill.container.getElementsByClassName('ql-editor')[0];
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
        const editor = quill.container.getElementsByClassName('ql-editor')[0];
        editor.dispatchEvent(touch);
        expect(cursor.toggleNearCursor).toBeCalled();

        jest.runAllTimers();

        expect(cursor.toggleFlag).toBeCalled();
      });
    });
  });

  function createLeaf(tag?: string): any[] {
    const domNode = tag ? document.createElement(tag) : document.createTextNode('');
    return [{domNode}, 0];
  }
});
