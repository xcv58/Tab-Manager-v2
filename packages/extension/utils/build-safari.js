const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const config = require('../webpack.safari.config')()
const previews = require('../webpack.settings-preview.config')()
previews.name = 'settings-preview'
previews.dependencies = ['extension']
const production = (options) => ({
  ...options,
  mode: 'production',
  optimization: {
    minimizer: [new TerserPlugin({ parallel: true }), new CssMinimizerPlugin()],
  },
})
webpack(
  [production({ ...config, name: 'extension' }), production(previews)],
  (error, stats) => {
    if (error) {
      console.error(error)
      process.exitCode = 1
      return
    }
    if (stats.hasErrors()) {
      console.error(stats.toString({ colors: true }))
      process.exitCode = 1
    }
  },
)
