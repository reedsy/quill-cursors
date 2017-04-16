var path = require('path');
var UglifyJSPlugin = require('uglifyjs-webpack-plugin');

var moduleBundle = {

  entry: {
    'quill-cursors': './src/cursors.js',
    'quill-cursors.min': './src/cursors.js',
  },

  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },

  externals: {
    quill: 'Quill'
  },

  devServer: {
    contentBase: [
      path.join(__dirname, 'example'),
      path.join(__dirname, 'dist'),
      path.join(__dirname, 'node_modules/quill/dist')
    ]
  },

  plugins: [
    new UglifyJSPlugin({
      include: /\.min\.js$/,
    })
  ]
};

var exampleBundle = {};

module.exports = [ moduleBundle ];
