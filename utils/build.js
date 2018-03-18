const webpack = require('webpack')
const config = require('../webpack.config')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

delete config.chromeExtensionBoilerplate
const { plugins } = config

webpack(
  {
    ...config,
    mode: 'production',
    plugins: [
      ...plugins,
      new UglifyJSPlugin()
    ]
  },
  function (err) {
    if (err) throw err
  }
)
