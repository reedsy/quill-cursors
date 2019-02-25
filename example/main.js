Quill.register('modules/cursors', QuillCursors);

const quillOne = new Quill('#editor-one', {
  theme: 'snow',
  modules: {
    cursors: true,
  }
});

const quillTwo = new Quill('#editor-two', {
  theme: 'snow',
  modules: {
    cursors: true,
  }
});

const cursorsOne = quillOne.getModule('cursors');
const cursorsTwo = quillTwo.getModule('cursors');

cursorsOne.createCursor(2, 'User 2', 'blue');
cursorsTwo.createCursor(1, 'User 1', 'red');

function textChangeHandler(quill) {
  return function(delta, oldContents, source) {
    if (source === 'user') {
      quill.updateContents(delta);
    }
  };
}

quillOne.on('text-change', textChangeHandler(quillTwo));
quillTwo.on('text-change', textChangeHandler(quillOne));

quillOne.on('selection-change', function(range) {
  cursorsTwo.moveCursor(1, range);
});

quillTwo.on('selection-change', function(range) {
  cursorsOne.moveCursor(2, range);
});
