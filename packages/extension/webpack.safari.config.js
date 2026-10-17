const path = require('path')
const webpack = require('webpack')
const fs = require('fs')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const base = require('./webpack.config')

module.exports = () => {
  const config = base()
  return {
    ...config,
    entry: {
      popup: path.join(__dirname, 'src/js/safari/popup.tsx'),
      background: path.join(__dirname, 'src/js/safari/background.ts'),
    },
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        'webextension-polyfill$': path.join(
          __dirname,
          'src/js/safari/browser.ts',
        ),
      },
    },
    plugins: [
      ...config.plugins.filter(
        (plugin) =>
          !(plugin instanceof CopyWebpackPlugin) &&
          !(plugin instanceof HtmlWebpackPlugin),
      ),
      new HtmlWebpackPlugin({
        filename: 'popup.html',
        chunks: ['popup'],
        templateContent: fs
          .readFileSync(path.join(__dirname, 'src/popup.html'), 'utf8')
          .replace(
            /<link\s+rel="stylesheet"\s+href="https:\/\/fonts\.googleapis\.com[\s\S]*?\/>/,
            '',
          )
          .replace(
            'Search, move, group, and clean up tabs across browser windows',
            'Find and manage Safari tabs locally',
          ),
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'src/img/*.png', to: '[name][ext]' },
          {
            from: '../safari-native/WebExtension/manifest.json',
            to: 'manifest.json',
          },
          {
            from: '../safari-native/WebExtension/sample.html',
            to: 'sample.html',
          },
          {
            from: '../safari-native/WebExtension/sample.js',
            to: 'sample.js',
          },
        ],
      }),
      // Safari compatibility must never fall through to Chromium callback APIs.
      new webpack.DefinePlugin({
        chrome: 'undefined',
        'window.chrome': 'undefined',
        'globalThis.chrome': 'undefined',
      }),
    ],
  }
}
