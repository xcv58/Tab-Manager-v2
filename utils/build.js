const webpack = require('webpack')
const config = require('../webpack.config')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

require('./prepare')

delete config.chromeExtensionBoilerplate
const { plugins } = config

webpack(
  {
    ...config,
    plugins: [
      ...plugins,
      new UglifyJSPlugin()
    ]
  },
  function (err) {
    if (err) throw err
  }
)
