const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const webpack = require('webpack')
const extensionConfig = require('./webpack.config')

// A separate bundle guarantees that Settings previews cannot import the real
// browser API. The actual popup components run against the in-memory adapter.
module.exports = () => {
  const config = extensionConfig()
  return {
    ...config,
    name: 'settings-preview',
    dependencies: ['extension'],
    entry: {
      'settings-preview': path.join(__dirname, 'src/js/settings-preview.tsx'),
    },
    output: {
      ...config.output,
      publicPath: './',
      chunkFilename: 'settings-preview-[id].js',
    },
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        'webextension-polyfill$': path.join(
          __dirname,
          'src/js/demo/browser.ts',
        ),
      },
    },
    plugins: [
      ...config.plugins.filter(
        (plugin) =>
          !(plugin instanceof CleanWebpackPlugin) &&
          !(plugin instanceof MiniCssExtractPlugin) &&
          !(plugin instanceof CopyWebpackPlugin) &&
          !(plugin instanceof HtmlWebpackPlugin),
      ),
      // Group compatibility helpers also probe Chrome's callback API directly.
      // In this bundle those probes must use only the aliased memory adapter.
      new webpack.DefinePlugin({
        chrome: 'undefined',
        'window.chrome': 'undefined',
        'globalThis.chrome': 'undefined',
      }),
      new MiniCssExtractPlugin({
        filename: '[name].css',
        chunkFilename: 'settings-preview-[id].css',
      }),
      new HtmlWebpackPlugin({
        template: path.join(__dirname, 'src/settings-preview.html'),
        filename: 'settings-preview.html',
        chunks: ['settings-preview'],
      }),
    ],
  }
}
