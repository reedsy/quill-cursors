var quillOne = new Quill('#editor-one', {
  theme: 'snow',
  modules: {
    'cursors': true
  }
});

var quillTwo = new Quill('#editor-two', {
  theme: 'snow',
  modules: {
    'cursors': true
  }
});

var cursorsOne = quillOne.getModule('cursors');
var cursorsTwo = quillTwo.getModule('cursors');

cursorsOne.registerTextChangeListener();
cursorsTwo.registerTextChangeListener();

function textChangeHandler(quill) {
  return function(delta, oldDelta, source) {
    if (source == 'user')
      quill.updateContents(delta);
  };
}

quillOne.on('text-change', textChangeHandler(quillTwo));
quillTwo.on('text-change', textChangeHandler(quillOne));

quillOne.on('selection-change', function(range, oldRange, source) {
  if (range)
    cursorsTwo.set({
      id: '1',
      name: 'User 1',
      color: 'red',
      range: range
    });
});

quillTwo.on('selection-change', function(range, oldRange, source) {
  if (range)
    cursorsOne.set({
      id: '2',
      name: 'User 2',
      color: 'blue',
      range: range
    });
});
