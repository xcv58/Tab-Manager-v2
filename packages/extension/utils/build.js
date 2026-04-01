const webpack = require('webpack')
const config = require('../webpack.config')()
const TerserJSPlugin = require('terser-webpack-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

delete config.chromeExtensionBoilerplate

webpack(
  {
    ...config,
    mode: 'production',
    optimization: {
      minimizer: [
        new TerserJSPlugin({
          test: /\.js(\?.*)?$/i,
          parallel: true,
        }),
        new CssMinimizerPlugin(),
      ],
    },
  },
  function (err, stats) {
    if (err) throw err
    if (stats.hasErrors()) {
      console.log(stats.toString({ colors: true }))
      process.exit(1)
    }
  },
)
