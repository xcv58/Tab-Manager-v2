const path = require('path')
const webpack = require('webpack')
const config = require('../webpack.demo.config')()

if (process.argv.includes('--build')) {
  webpack({ ...config, mode: 'production' }, (error, stats) => {
    if (error) throw error
    console.log(stats.toString({ colors: true, chunks: false, modules: false }))
    if (stats.hasErrors()) process.exitCode = 1
  })
} else {
  const WebpackDevServer = require('webpack-dev-server')
  config.output.publicPath = '/demo/'
  const server = new WebpackDevServer(
    {
      host: process.env.DEMO_HOST || '127.0.0.1',
      port: process.env.DEMO_PORT || 3002,
      hot: false,
      liveReload: true,
      static: {
        directory: path.resolve(__dirname, '../../../docs'),
        publicPath: '/',
        watch: false,
      },
      devMiddleware: { publicPath: '/demo/' },
      client: { overlay: true },
    },
    webpack({ ...config, mode: 'development' }),
  )
  server.start().then(() => {
    console.log(`Demo: http://127.0.0.1:${process.env.DEMO_PORT || 3002}/demo/`)
  })
}
