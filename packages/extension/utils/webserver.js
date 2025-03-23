// eslint-disable-next-line @typescript-eslint/no-require-imports
const WebpackDevServer = require('webpack-dev-server')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpack = require('webpack')
// const HardSourceWebpackPlugin = require('hard-source-webpack-plugin')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const env = require('./env')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../webpack.config')([
  new webpack.HotModuleReplacementPlugin(),
  // new HardSourceWebpackPlugin()
])

const options = config.chromeExtensionBoilerplate || {}
const excludeEntriesToHotReload = options.notHotReload || []

for (const entryName in config.entry) {
  if (excludeEntriesToHotReload.indexOf(entryName) === -1) {
    config.entry[entryName] = [
      'webpack-dev-server/client?http://localhost:' + env.PORT,
      'webpack/hot/dev-server',
    ].concat(config.entry[entryName])
  }
}

delete config.chromeExtensionBoilerplate

const compiler = webpack({ ...config, mode: 'development' })

const server = new WebpackDevServer(
  {
    devMiddleware: {
      writeToDisk: true,
    },
    hot: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    port: env.PORT,
  },
  compiler,
)

server.start()
