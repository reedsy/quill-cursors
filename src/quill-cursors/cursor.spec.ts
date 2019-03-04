import Cursor from './cursor';
import IQuillCursorsOptions from './i-quill-cursors-options';
import 'jest-dom/extend-expect';

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
    };
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

  it('updates the caret position', () => {
    const cursor = new Cursor('abc', 'Jane Bloggs', 'red');
    const element = cursor.build(options);

    const rectangle: any = {
      top: 100,
      left: 200,
      height: 50,
    };

    cursor.updateCaret(rectangle);

    const caretContainer = element.getElementsByClassName(Cursor.CARET_CONTAINER_CLASS)[0];
    expect(caretContainer).toHaveStyle('top: 100px');
    expect(caretContainer).toHaveStyle('left: 200px');
    expect(caretContainer).toHaveStyle('height: 50px');

    const flag = element.getElementsByClassName(Cursor.FLAG_CLASS)[0];
    expect(flag).toHaveStyle('top: 100px');
    expect(flag).toHaveStyle('left: 200px');
  });

  describe('with some selections', () => {
    let cursor: Cursor;
    let element: HTMLElement;
    let container: any;

    beforeEach(() => {
      cursor = new Cursor('abc', 'Jane Bloggs', 'red');
      element = cursor.build(options);

      const selection1: any = {
        top: 0,
        left: 50,
        width: 100,
        height: 200,
      };

      const selection2: any = {
        top: 1000,
        left: 1050,
        width: 200,
        height: 300,
      };

      container = {
        top: 0,
        left: 0,
        width: 2000,
        height: 2000,
      };

      cursor.updateSelection([selection1, selection2], container);
    });

    it('adds selections', () => {
      const selections = element.getElementsByClassName(Cursor.SELECTION_CLASS)[0];

      expect(selections.children.length).toBe(2);

      expect(selections.children[0]).toHaveStyle('top: 0px');
      expect(selections.children[0]).toHaveStyle('left: 50px');
      expect(selections.children[0]).toHaveStyle('width: 100px');
      expect(selections.children[0]).toHaveStyle('height: 200px');
      expect(selections.children[0]).toHaveStyle('background-color: rgba(255, 0, 0, 0.3)');

      expect(selections.children[1]).toHaveStyle('top: 1000px');
      expect(selections.children[1]).toHaveStyle('left: 1050px');
      expect(selections.children[1]).toHaveStyle('width: 200px');
      expect(selections.children[1]).toHaveStyle('height: 300px');
      expect(selections.children[1]).toHaveStyle('background-color: rgba(255, 0, 0, 0.3)');
    });

    it('clears the selection if nothing is passed in', () => {
      cursor.updateSelection(null, container);
      const selections = element.getElementsByClassName(Cursor.SELECTION_CLASS)[0];
      expect(selections.children).toHaveLength(0);
    });
  });
});
