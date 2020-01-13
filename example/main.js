Quill.register('modules/cursors', QuillCursors);

// Constant to simulate a high-latency connection when sending cursor
// position updates.
const CURSOR_LATENCY = 1000;

// Constant to simulate a high-latency connection when sending
// text changes.
const TEXT_LATENCY = 500;

const quillOne = new Quill('#editor-one', {
  theme: 'snow',
  modules: {
    cursors: {
      transformOnTextChange: true,
    },
  },
});

const quillTwo = new Quill('#editor-two', {
  theme: 'snow',
  modules: {
    cursors: {
      transformOnTextChange: true,
    },
  },
});

const cursorsOne = quillOne.getModule('cursors');
const cursorsTwo = quillTwo.getModule('cursors');

cursorsOne.createCursor('cursor', 'User 2', 'blue');
cursorsTwo.createCursor('cursor', 'User 1', 'red');

function textChangeHandler(quill) {
  return function(delta, oldContents, source) {
    if (source === 'user') {
      setTimeout(() => quill.updateContents(delta), TEXT_LATENCY);
    }
  };
}

function selectionChangeHandler(cursors) {
  const debouncedUpdate = debounce(updateCursor, 500);

  return function(range, oldRange, source) {
    if (source === 'user') {
      // If the user has manually updated their selection, send this change
      // immediately, because a user update is important, and should be
      // sent as soon as possible for a smooth experience.
      updateCursor(range);
    } else {
      // Otherwise, it's a text change update or similar. These changes will
      // automatically get transformed by the receiving client without latency.
      // If we try to keep sending updates, then this will undo the low-latency
      // transformation already performed, which we don't want to do. Instead,
      // add a debounce so that we only send the update once the user has stopped
      // typing, which ensures we send the most up-to-date position (which should
      // hopefully match what the receiving client already thinks is the cursor
      // position anyway).
      debouncedUpdate(range);
    }
  };

  function updateCursor(range) {
    // Use a timeout to simulate a high latency connection.
    setTimeout(() => cursors.moveCursor('cursor', range), CURSOR_LATENCY);
  }
}

quillOne.on('text-change', textChangeHandler(quillTwo));
quillTwo.on('text-change', textChangeHandler(quillOne));

quillOne.on('selection-change', selectionChangeHandler(cursorsTwo));
quillTwo.on('selection-change', selectionChangeHandler(cursorsOne));

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    const later = function() {
      timeout = null;
      func.apply(context, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
