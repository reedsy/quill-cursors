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
  // TODO
};