import Cursor from './cursor';

const template = `
  <span class="${ Cursor.SELECTION_CLASS }"></span>
  <span class="${ Cursor.CARET_CONTAINER_CLASS }">
    <span class="${ Cursor.CARET_CLASS }"></span>
  </span>
  <div class="${ Cursor.FLAG_CLASS }">
    <small class="${ Cursor.NAME_CLASS }"></small>
    <span class="${ Cursor.FLAG_FLAP_CLASS }"></span>
  </div>
`;

export default template;
