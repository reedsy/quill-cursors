import RangeFix from 'rangefix/rangefix';
import Quill from 'Quill';

var DEFAULT_OPTIONS = {
  template: [
    '<span class="cursor-selections"></span>',
    '<span class="cursor-caret-container">',
    '  <span class="cursor-caret"></span>',
    '</span>',
    '<div class="cursor-flag">',
    '  <small class="cursor-name"></small>',
    '  <span class="cursor-flag-flap"></span>',
    '</div>'
  ].join('')
};

function CursorsModule(quill, options) {
  this.quill = quill;
  this._initOptions(options);
  this.cursors = {};
  this.container = this.quill.addContainer('ql-cursors');

  window.addEventListener('resize', this.refreshAll.bind(this));
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
  this.options = DEFAULT_OPTIONS;
  this.template = options.template || this.template;
};

CursorsModule.prototype._build = function(data) {
  var el = document.createElement('span');
  var selectionEl;
  var caretEl;
  var flagEl;

  el.classList.add('cursor');
  el.innerHTML = this.options.template;
  selectionEl = el.querySelector('.cursor-selections');
  caretEl = el.querySelector('.cursor-caret-container');
  flagEl = el.querySelector('.cursor-flag');

  // Set color
  flagEl.style.backgroundColor = data.color;
  caretEl.querySelector('.cursor-caret').style.backgroundColor = data.color;

  el.querySelector('.cursor-name').innerText = data.name;

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
    lookbackOffset = 0;

    if (op.retain) {
      index += op.retain;

      // Store last retain char, for lookback fix purposes (see below)
      lastRetainChar = charAt.call(this, index - 1);
    } else {
      if (op.insert) {
        // Quill/Delta operation diff optimization/merge policy fix
        // Note: When you have 'word|\n' and insert a '\n', op comes as (retain: 5, insert: '\n')
        // and not with retain 4, because of diff/merge policy internal to Delta/Quill OT format.
        // To alleviate this, we probe the char on the last index of the last retain,
        // and if it's the same as the first of the insert
        // we keep shifting one position back as an offset.
        if (op.insert.length &&
          lastRetainChar == op.insert.charAt(0)) {

          lookbackOffset = getLookbackOffset.call(this, index, lastRetainChar);
        }

        index += this._shiftAll(index - lookbackOffset, op.insert.length);
      } else if (op.delete) {
        // Quill/Delta operation diff optimization/merge policy fix
        // Note: When you have 'word\n|\n' and delete the '\n', op comes as (retain: 6, delete: 1)
        // and not with retain 5, because of diff/merge policy internal to Delta/Quill OT format.
        // To alleviate this, we probe the char on the last index of the last retain
        // and keep shifting one position back as an offset.
        lookbackOffset = getLookbackOffset.call(this, index, lastRetainChar);

        index += this._shiftAll(index - lookbackOffset, -1 * op.delete);
      }

      // Clear last retain char
      lastRetainChar = undefined;
    }
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
  rects = RangeFix.getClientRects(range);

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

    selectionBlockEl.classList.add('selection-block');
    selectionBlockEl.style.top = (rect.top - containerRect.top) + 'px';
    selectionBlockEl.style.left = (rect.left - containerRect.left) + 'px';
    selectionBlockEl.style.width = rect.width + 'px';
    selectionBlockEl.style.height = rect.height + 'px';
    selectionBlockEl.style.backgroundColor = tinycolor(cursor.color).setAlpha(0.3).toString();

    return selectionBlockEl;
  }
};

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

Quill.register('modules/cursors', CursorsModule);