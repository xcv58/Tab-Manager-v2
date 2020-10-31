const webpack = require('webpack')
const config = require('../webpack.config')()
const TerserJSPlugin = require('terser-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')

delete config.chromeExtensionBoilerplate

webpack(
  {
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
  },
  function (err) {
    if (err) throw err
  }
)
