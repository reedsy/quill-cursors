import Quill from 'quill';
import 'rangefix/rangefix';
import tinycolor from 'tinycolor2';

var DEFAULTS = {
  template: [
    '<span class="ql-cursor-selections"></span>',
    '<span class="ql-cursor-caret-container">',
    '  <span class="ql-cursor-caret"></span>',
    '</span>',
    '<div class="ql-cursor-flag">',
    '  <small class="ql-cursor-name"></small>',
    '  <span class="ql-cursor-flag-flap"></span>',
    '</div>'
  ].join(''),
  autoRegisterListener: true
};

function CursorsModule(quill, options) {
  this.quill = quill;
  this._initOptions(options);
  this.cursors = {};
  this.container = this.quill.addContainer('ql-cursors');

  window.addEventListener('resize', this.refreshAll.bind(this));

  if(this.options.autoRegisterListener)
    this.registerTextChangeListener();
}

CursorsModule.prototype.registerTextChangeListener = function() {
  this.quill.on(this.quill.constructor.events.TEXT_CHANGE, this._applyDelta.bind(this));
};

CursorsModule.prototype.set = function(data) {
  var cursor;

  if (cursor = this.cursors[data.id]) {
    this.move(cursor, data.range);
  } else {
    cursor = this._build(data);
    window.setTimeout(function() {
      this.move(cursor, data.range);
    }.bind(this));
  };
};

CursorsModule.prototype.move = function(cursor, range) {
  cursor.range = range;
  cursor.el.classList.remove('hidden');
  this._update(cursor);
};

CursorsModule.prototype.refreshAll = function() {
  Object.keys(this.cursors).forEach(function(id) {
    this._update(this.cursors[id]);
  }, this);
};

CursorsModule.prototype.hide = function(cursor) {
  cursor.el.classList.add('hidden');
};

CursorsModule.prototype.remove = function(cursor) {
  cursor.el.parentNode.removeChild(cursor.el);
  delete this.cursors[cursor.id];
};

CursorsModule.prototype.removeAll = function() {
  Object.keys(this.cursors).forEach(function(id) {
    this.remove(this.cursors[id])
  }, this);
};

CursorsModule.prototype._initOptions = function(options) {
  this.options = DEFAULTS;
  this.options.template = options.template || this.options.template;
  this.options.autoRegisterListener = options.autoRegisterListener || this.options.autoRegisterListener;
};

CursorsModule.prototype._build = function(data) {
  var el = document.createElement('span');
  var selectionEl;
  var caretEl;
  var flagEl;

  el.classList.add('ql-cursor');
  el.innerHTML = this.options.template;
  selectionEl = el.querySelector('.ql-cursor-selections');
  caretEl = el.querySelector('.ql-cursor-caret-container');
  flagEl = el.querySelector('.ql-cursor-flag');

  // Set color
  flagEl.style.backgroundColor = data.color;
  caretEl.querySelector('.ql-cursor-caret').style.backgroundColor = data.color;

  el.querySelector('.ql-cursor-name').innerText = data.name;

  this.container.appendChild(el);

  return this.cursors[data.id] = {
    id: data.id,
    color: data.color,
    el: el,
    selectionEl: selectionEl,
    caretEl: caretEl,
    flagEl: flagEl,
    range: null
  };
};

CursorsModule.prototype._applyDelta = function(delta, oldDelta, source) {
  var index = 0,
    lastRetainChar,
    lookbackOffset;

  function charAt(index) {
    var contentAt;

    if (index < 0) return;

    contentAt = this.quill.getContents(index, index + 1);

    return contentAt.ops[0] && contentAt.ops[0].insert;
  }

  function getLookbackOffset(index, char) {
    var offset = 0;

    while (char && charAt.call(this, index - 1 - offset) == char)
      offset++;

    return offset;
  }

  delta.ops.forEach(function(op) {
    if (op.retain)
      index += op.retain;
    else if (op.insert)
      index += this._shiftAll(index, op.insert.length);
    else if (op.delete)
      index += this._shiftAll(index, -1 * op.delete);
  }, this);

  this.refreshAll();
};

CursorsModule.prototype._shiftCursor = function(cursor, index, length) {
  cursor.range.index += (cursor.range.index > index) ? length : 0;
};

CursorsModule.prototype._shiftAll = function(index, length) {
  var selection;

  Object.keys(this.cursors).forEach(function(id) {
    if ((selection = this.cursors[id]) && selection.range) {
      // If characters we're added or there is no selection
      // advance start/end if it's greater or equal than index
      if (length > 0 || selection.range.length == 0)
        this._shiftCursor(selection, index - 1, length);
      // Else if characters were removed
      // move start/end back if it's only greater than index
      else
        this._shiftCursor(selection, index, length);
    }
  }, this);

  return length;
};

CursorsModule.prototype._update = function(cursor) {
  if (!cursor || !cursor.range) return;

  var containerRect = this.quill.container.getBoundingClientRect();
  var startLeaf = this.quill.getLeaf(cursor.range.index);
  var endLeaf = this.quill.getLeaf(cursor.range.index + cursor.range.length);
  var range = document.createRange();
  var rects;

  // Sanity check
  if (!startLeaf || !endLeaf ||
    !startLeaf[0] || !endLeaf[0] ||
    startLeaf[1] < 0 || endLeaf[1] < 0 ||
    !startLeaf[0].domNode || !endLeaf[0].domNode) {
    return this.hide(cursor);
  }

  range.setStart(startLeaf[0].domNode, startLeaf[1]);
  range.setEnd(endLeaf[0].domNode, endLeaf[1]);
  rects = window.RangeFix.getClientRects(range);

  this._updateCaret(cursor, endLeaf, containerRect);
  this._updateSelection(cursor, rects, containerRect);
};

CursorsModule.prototype._updateCaret = function(cursor, leaf) {
  var rect, index = cursor.range.index + cursor.range.length;

  // The only time a valid offset of 0 can occur is when the cursor is positioned
  // before the first character in a line, and it will be the case that the start
  // and end points of the range will be exactly the same... if they are not then
  // a block selection is taking place and we need to offset the character position
  // by -1;
  if (index > 0 && leaf[1] === 0 && cursor.range.index !== (cursor.range.index + cursor.range.length)) {
    index--;
  }

  rect = this.quill.getBounds(index);

  cursor.caretEl.style.top = (rect.top) + 'px';
  cursor.caretEl.style.left = (rect.left) + 'px';
  cursor.caretEl.style.height = rect.height + 'px';

  cursor.flagEl.style.top = (rect.top) + 'px';
  cursor.flagEl.style.left = (rect.left) + 'px';
};

CursorsModule.prototype._updateSelection = function(cursor, rects, containerRect) {
  function createSelectionBlock(rect) {
    var selectionBlockEl = document.createElement('span');

    selectionBlockEl.classList.add('ql-cursor-selection-block');
    selectionBlockEl.style.top = (rect.top - containerRect.top) + 'px';
    selectionBlockEl.style.left = (rect.left - containerRect.left) + 'px';
    selectionBlockEl.style.width = rect.width + 'px';
    selectionBlockEl.style.height = rect.height + 'px';
    selectionBlockEl.style.backgroundColor = tinycolor(cursor.color).setAlpha(0.3).toString();

    return selectionBlockEl;
  }

  // Wipe the slate clean
  cursor.selectionEl.innerHTML = null;

  var index = [];
  var rectIndex;

  [].forEach.call(rects, function(rect) {
    rectIndex = ('' + rect.top + rect.left + rect.width + rect.height);

    // Note: Safari throws a rect with length 1 when caret with no selection.
    // A check was addedfor to avoid drawing those carets - they show up on blinking.
    if (!~index.indexOf(rectIndex) && rect.width > 1) {
      index.push(rectIndex);
      cursor.selectionEl.appendChild(createSelectionBlock(rect));
    }
  }, this);
};

Quill.register('modules/cursors', CursorsModule);
