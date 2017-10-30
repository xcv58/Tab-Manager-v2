const webpack = require('webpack')
const config = require('../webpack.config')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const { plugins } = config

webpack({
  ...config,
  plugins: [
    ...plugins,
    new BundleAnalyzerPlugin({
      analyzerMode: 'server',
      analyzerHost: '127.0.0.1',
      analyzerPort: 8888,
      defaultSizes: 'parsed',
      openAnalyzer: true,
      generateStatsFile: false,
      logLevel: 'info'
    })
  ]
}, function (err) {
  if (err) throw err
})
