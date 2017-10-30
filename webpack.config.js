const webpack = require('webpack')
const path = require('path')
const fileSystem = require('fs')
const env = require('./utils/env')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const WriteFilePlugin = require('write-file-webpack-plugin')

// load the secrets
const alias = {}

const secretsPath = path.join(__dirname, 'secrets.' + env.NODE_ENV + '.js')

const fileExtensions = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'eot',
  'otf',
  'svg',
  'ttf',
  'woff',
  'woff2'
]

if (fileSystem.existsSync(secretsPath)) {
  alias['secrets'] = secretsPath
}

const imgDir = path.join(__dirname, 'src/img')
const images = fileSystem
.readdirSync(imgDir)
.filter(x => x.endsWith('.png'))
.map(x => path.join(imgDir, x))

const HtmlFiles = [
  'popup',
  'options'
].map(
  (name) => new HtmlWebpackPlugin({
    template: path.join(__dirname, 'src', `${name}.html`),
    filename: `${name}.html`,
    chunks: [ name ]
  })
)

const entry = Object.assign(...[
  'popup',
  'options',
  'background'
].map(
  (name) => ({ [name]: path.join(__dirname, 'src', 'js', `${name}.js`) }))
)

const options = {
  entry,
  output: {
    path: path.join(__dirname, 'build'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader',
        exclude: /node_modules/
      },
      {
        test: new RegExp(`\\.(${fileExtensions.join('|')})$`),
        loader: 'file-loader?name=[name].[ext]',
        exclude: /node_modules/
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(js|jsx)$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    alias: alias,
    modules: [
      'node_modules',
      'src',
      'src/js'
    ],
    extensions: fileExtensions
      .map(extension => '.' + extension)
      .concat(['.jsx', '.js', '.css'])
  },
  plugins: [
    // expose and write the allowed env vars on the compiled bundle
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV)
    }),
    new CopyWebpackPlugin([
      ...images,
      { from: 'src/css/popup.css' }
    ]),
    ...HtmlFiles,
    new WriteFilePlugin()
  ]
}

if (env.NODE_ENV === 'development') {
  options.devtool = 'cheap-module-eval-source-map'
}

module.exports = options
