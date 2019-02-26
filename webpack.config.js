const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
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
      path.join(__dirname, 'node_modules/quill/dist')
    ],
  },
  plugins: [
    new CleanWebpackPlugin(['dist']),
    new DtsBundlePlugin(),
  ],
};

if (environment === 'production') {
  moduleBundle.module.rules.push({
    test: /\.ts$/,
    exclude: /node_modules/,
    use: [{
      loader: 'tslint-loader',
      options: {
        emitErrors: true,
        formatter: 'stylish',
        tsConfigFile: 'tsconfig.base.json',
      },
    }],
  });

  delete moduleBundle.devtool;
}

function DtsBundlePlugin(){}
DtsBundlePlugin.prototype.apply = function (compiler) {
  compiler.plugin('done', function(){
    const dts = require('dts-bundle');

    dts.bundle({
      name: 'QuillCursors',
      main: 'src/index.d.ts',
      out: '../dist/quill-cursors.d.ts',
      removeSource: true,
      outputAsModuleFolder: true // to use npm in-package typings
    });
  });
};

module.exports = [moduleBundle];
