# quill-cursors
A multi cursor module for Quill.

## Install

Install `quill-cursors` module through npm:

```bash
$ npm install quill-cursors --save
```
Or you can just take the files from the `dist` folder. That works too.

## Usage

To include `quill-cursors` in your Quill project, simply add the stylesheet and all the Javascripts to your page. The module already takes care of its registering so you just need to add 'cursors' to your module config when you instantiate your editor(s).

```html
<head>
  ...
  <link rel="stylesheet" href="/path/to/quill-cursors.css">
  ...
</head>
<body>
  ...
  <script src="/path/to/quill.min.js"></script>
  <script src="/path/to/quill-cursors.min.js"></script>
  <script>
    var editor = new Quill('#editor-container', {
      modules: {
        'cursors': true,
      }
    });

    editor.registerTextChangeListener();
  </script>

</body>
```

To set a multicursor call:

```
editor.getModule('cursors').set({
  id: '1',
  name: 'User 1',
  color: 'red',
  range: range
});
```

For more info check out [the included example](example).

## Development

Run `npm run build` to package a build and `npm run start` to build, start the example webserver and watch for changes.

## TODO

A few things that can be improved:

* Add tests
* Improve bundling, namely on styles/add minified styles
