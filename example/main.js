var quillOne = new Quill('#editor-one', {
  theme: 'snow'
});

var quillTwo = new Quill('#editor-two', {
  theme: 'snow'
});

function textChangeHandler(quill) {
  return function(delta, oldDelta, source) {
    if (source == 'user')
      quill.updateContents(delta);
  };
}

quillOne.on('text-change', textChangeHandler(quillTwo));
quillTwo.on('text-change', textChangeHandler(quillOne));
