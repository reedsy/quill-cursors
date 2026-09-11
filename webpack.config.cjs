const path = require('path');

const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';

const baseConfig = {
  resolve: {
    extensions: ['.ts', '.js'],
    // Source uses node16-style `./x.js` specifiers that map onto .ts files.
    extensionAlias: {'.js': ['.ts', '.js']},
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    library: {type: 'module'},
  },
  experiments: {outputModule: true},
  mode: environment,
  devtool: isProduction ? false : 'inline-source-map',
};

const tsRule = {
  test: /\.ts$/,
  exclude: /node_modules/,
  use: ['ts-loader'],
};

const scssRule = {
  test: /\.scss$/,
  use: [
    'style-loader',
    'css-loader',
    'sass-loader',
  ],
};

const moduleBundle = {
  ...baseConfig,
  entry: {
    'quill-cursors': './src/styled.ts',
  },
  module: {
    rules: [tsRule, scssRule],
  },
  devServer: {
    static: [
      path.join(__dirname, 'example'),
      path.join(__dirname, 'node_modules/quill/dist'),
    ],
  },
};

const coreBundleConfig = {
  ...baseConfig,
  entry: {
    'quill-cursors.core': './src/index.ts',
  },
  module: {
    rules: [tsRule],
  },
};

module.exports = [moduleBundle, coreBundleConfig];
