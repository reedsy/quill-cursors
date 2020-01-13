const path = require('path');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');

const environment = process.env.NODE_ENV || 'development';

const moduleBundle = {
  entry: {
    'quill-cursors': './src/index.ts',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: ['ts-loader'],
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    library: 'QuillCursors',
    libraryExport: 'default',
    libraryTarget: 'umd',
  },
  mode: environment,
  devtool: 'inline-source-map',
  devServer: {
    contentBase: [
      path.join(__dirname, 'example'),
      path.join(__dirname, 'node_modules/quill/dist'),
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
  ],
};

if (environment === 'production') {
  delete moduleBundle.devtool;
}

module.exports = [moduleBundle];
