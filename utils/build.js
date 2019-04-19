const webpack = require('webpack')
const config = require('../webpack.config')()
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin')

const smp = new SpeedMeasurePlugin()

delete config.chromeExtensionBoilerplate
const { plugins } = config

webpack(
  smp.wrap({
    ...config,
    mode: 'production',
    plugins: [
      ...plugins,
      new UglifyJSPlugin({
        uglifyOptions: {
          ecma: 6,
          toplevel: true,
          output: {
            comments: false
          }
        }
      })
    ]
  }),
  function (err) {
    if (err) throw err
  }
)
