const path = require('path');

const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';

const baseConfig = {
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    library: 'QuillCursors',
    libraryTarget: 'umd',
  },
  mode: environment,
  devtool: isProduction ? false : 'inline-source-map',
};

const moduleBundle = {
  ...baseConfig,
  entry: {
    'quill-cursors': './src/index.ts',
  },
  output: {
    ...baseConfig.output,
    libraryExport: 'default',
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
    'quill-cursors.core': './src/index.core.ts',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: ['ts-loader'],
      },
    ],
  },
};

module.exports = [moduleBundle, coreBundleConfig];
