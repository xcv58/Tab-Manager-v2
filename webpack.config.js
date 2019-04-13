const webpack = require('webpack')
const path = require('path')
const fileSystem = require('fs')
const env = require('./utils/env')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const WriteFilePlugin = require('write-file-webpack-plugin')

const srcPath = subdir => {
  return path.join(__dirname, 'src/js', subdir)
}

const alias = {
  background: srcPath('background'),
  components: srcPath('components'),
  libs: srcPath('libs'),
  stores: srcPath('stores'),
  svgIcons: srcPath('svgIcons'),
  img: path.join(__dirname, 'src/img')
}

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

const HtmlFiles = ['popup'].map(
  name =>
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', `${name}.html`),
      filename: `${name}.html`,
      chunks: [name]
    })
)

const entry = Object.assign(
  ...['popup', 'background'].map(name => ({
    [name]: path.join(__dirname, 'src', 'js', `${name}.js`)
  }))
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
        test: /\.(js|ts)x?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    alias,
    extensions: fileExtensions
      .map(extension => '.' + extension)
      .concat(['.css', '.jsx', '.js', '.tsx', 'ts'])
  },
  plugins: [
    // expose and write the allowed env vars on the compiled bundle
    new CleanWebpackPlugin(['build']),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV)
    }),
    new CopyWebpackPlugin([
      ...images,
      { from: 'src/css/popup.css' },
      {
        from: 'src/manifest.json',
        transform: function (content, path) {
          return Buffer.from(
            JSON.stringify({
              description: process.env.npm_package_description,
              version: process.env.npm_package_version,
              ...JSON.parse(content.toString())
            })
          )
        }
      }
    ]),
    ...HtmlFiles,
    new WriteFilePlugin()
  ]
}

if (env.NODE_ENV === 'development') {
  options.devtool = 'cheap-module-eval-source-map'
}

module.exports = (plugins = []) => ({
  ...options,
  plugins: [...options.plugins, ...plugins]
})
