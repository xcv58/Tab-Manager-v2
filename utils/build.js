const webpack = require('webpack')
const config = require('../webpack.config')()
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin')
const TerserJSPlugin = require('terser-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')

const smp = new SpeedMeasurePlugin()

delete config.chromeExtensionBoilerplate

webpack(
  smp.wrap({
    ...config,
    mode: 'production',
    optimization: {
      minimizer: [
        new TerserJSPlugin({
          test: /\.js(\?.*)?$/i,
          parallel: true
        }),
        new OptimizeCSSAssetsPlugin({})
      ]
    }
  }),
  function (err) {
    if (err) throw err
  }
)
