const webpack = require('webpack')
const path = require('path')
const fs = require('fs')
const env = require('./utils/env')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
// const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const ProgressBarPlugin = require('progress-bar-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin')
const glob = require('glob-all')

const alias = {
  img: path.join(__dirname, 'src/img'),
}

const jsEntry = 'src/js'
Object.assign(
  alias,
  ...fs
    .readdirSync(path.join(__dirname, jsEntry), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .map((entry) => ({ [entry]: path.join(__dirname, jsEntry, entry) }))
)

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
  'woff2',
]

if (fs.existsSync(secretsPath)) {
  alias.secrets = secretsPath
}

const imgDir = path.join(__dirname, 'src/img')
const images = fs
  .readdirSync(imgDir)
  .filter((x) => x.endsWith('.png'))
  .map((x) => path.join(imgDir, x))

const HtmlFiles = ['popup'].map(
  (name) =>
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', `${name}.html`),
      filename: `${name}.html`,
      chunks: [name],
      minify: {
        collapseWhitespace: true,
      },
    })
)

const entry = Object.assign(
  ...['popup', 'background'].map((name) => ({
    [name.replace('-v3', '')]: path.join(__dirname, 'src', 'js', `${name}.tsx`),
  }))
)

const options = {
  entry,
  output: {
    path: path.join(
      __dirname,
      'build',
      'build_' + (process.env.TARGET_BROWSER || 'chrome')
    ),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.m?js/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {},
          },
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                ident: 'postcss',
                plugins: [require('tailwindcss'), require('autoprefixer')],
              },
            },
          },
        ],
        include: path.resolve(__dirname, 'src'),
        exclude: /node_modules/,
      },
      {
        test: new RegExp(`\\.(${fileExtensions.join('|')})$`),
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
        },
        include: path.resolve(__dirname, 'src'),
        exclude: /node_modules/,
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        include: path.resolve(__dirname, 'src'),
        exclude: /node_modules/,
      },
      {
        test: /\.(js|ts)x?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              experimentalWatchApi: true,
            },
          },
        ],
        include: path.resolve(__dirname, 'src'),
      },
    ],
  },
  resolve: {
    alias,
    extensions: fileExtensions
      .map((extension) => '.' + extension)
      .concat(['.css', '.jsx', '.js', '.tsx', 'ts']),
  },
  plugins: [
    // expose and write the allowed env vars on the compiled bundle
    new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css',
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV),
      'process.env.TARGET_BROWSER': JSON.stringify(env.TARGET_BROWSER),
    }),
    new CopyWebpackPlugin({
      patterns: [
        ...images,
        {
          from:
            env.TARGET_BROWSER === 'chrome'
              ? 'src/manifest-v3.json'
              : 'src/manifest.json',
          transform: function (content) {
            const json = JSON.parse(content.toString())
            if (process.env.NODE_ENV === 'production') {
              delete json.content_security_policy
            }
            if (
              process.env.NODE_ENV === 'production' ||
              process.env.TARGET_BROWSER !== 'firefox'
            ) {
              delete json.browser_specific_settings
            }
            if (process.env.TARGET_BROWSER === 'firefox') {
              delete json.offline_enabled
            }
            if (process.env.TARGET_BROWSER !== 'firefox') {
              json.permissions = json.permissions.filter(
                (permission) =>
                  !['contextualIdentities', 'cookies'].includes(permission)
              )
            }
            if (process.env.TARGET_BROWSER === 'chrome') {
              json.permissions = json.permissions.concat('tabGroups')
            }
            return Buffer.from(
              JSON.stringify({
                description: process.env.npm_package_description,
                version: process.env.npm_package_version,
                ...json,
              })
            )
          },
          to: 'manifest.json',
        },
      ],
    }),
    ...HtmlFiles,
    // new ForkTsCheckerWebpackPlugin({
    //   tsconfig: path.join(__dirname, 'tsconfig.json')
    // }),
    new ProgressBarPlugin(),
    process.env.NODE_ENV === 'production' &&
      new PurgeCSSPlugin({
        paths: () => glob.sync(`${__dirname}/src/js/**/*`, { nodir: true }),
        defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
      }),
  ].filter((x) => !!x),
}

if (env.NODE_ENV === 'development') {
  options.devtool = 'source-map'
}

module.exports = (plugins = []) => ({
  ...options,
  plugins: [...options.plugins, ...plugins],
})
