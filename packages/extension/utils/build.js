const webpack = require('webpack')
const config = require('../webpack.config')()
const settingsPreviewConfig = require('../webpack.settings-preview.config')()
const TerserJSPlugin = require('terser-webpack-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

delete config.chromeExtensionBoilerplate

const productionConfig = (options) => ({
  ...options,
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
})

webpack(
  [
    productionConfig({ ...config, name: 'extension' }),
    productionConfig(settingsPreviewConfig),
  ],
  function (err, stats) {
    if (err) throw err
    if (stats.hasErrors()) {
      console.log(stats.toString({ colors: true }))
      process.exit(1)
    }
  },
)
