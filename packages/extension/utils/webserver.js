const WebpackDevServer = require('webpack-dev-server')
const webpack = require('webpack')
// const HardSourceWebpackPlugin = require('hard-source-webpack-plugin')
const env = require('./env')
const path = require('path')

const config = require('../webpack.config')([
  new webpack.HotModuleReplacementPlugin()
  // new HardSourceWebpackPlugin()
])

const options = config.chromeExtensionBoilerplate || {}
const excludeEntriesToHotReload = options.notHotReload || []

for (var entryName in config.entry) {
  if (excludeEntriesToHotReload.indexOf(entryName) === -1) {
    config.entry[entryName] = [
      'webpack-dev-server/client?http://localhost:' + env.PORT,
      'webpack/hot/dev-server'
    ].concat(config.entry[entryName])
  }
}

delete config.chromeExtensionBoilerplate

const compiler = webpack({ ...config, mode: 'development' })

const server = new WebpackDevServer(compiler, {
  stats: 'minimal',
  hot: true,
  disableHostCheck: true,
  contentBase: path.join(__dirname, '../build'),
  headers: { 'Access-Control-Allow-Origin': '*' }
})

server.listen(env.PORT)
