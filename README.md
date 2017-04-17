# quill-cursors
A multi cursor module for [Quill](https://github.com/quilljs/quill) text editor.

## Install

Install `quill-cursors` module through npm:

```bash
$ npm install quill-cursors --save
```

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

To set a cursor call:

```javascript
editor.getModule('cursors').set({
  id: '1',
  name: 'User 1',
  color: 'red',
  range: range
});
```

**Please note**, that this module only handles the cursors drawing on a Quill instance. You must produce some additional code to handle actual cursor sync in a real scenario. So, it's assumed that:

* You should implement some sort of server-side code/API (or another suitable mechanism) to maintain cursors information synced across clients/Quill instances;
* This module is responsible for automatically updating the cursors configured on the instance when there is a `'text-change'` event - so if the client/instance contents are updated locally or through a `updateContents()` call, one shouldn't be needing to do anything to update/shift the displayed cursors;
* It is expected for the clients/instances to send updated cursor/range information on `selection-change` events;​

For a simple local-based implementation, check [the included example](example).

## Development

Run `npm run build` to package a build and `npm run start` to build, start the example webserver and watch for changes.

## TODO

A few things that can be improved:

* Add tests
* Improve bundling, namely on styles/add minified styles
* Better API documentation
