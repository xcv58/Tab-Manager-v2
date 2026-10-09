const path = require('path')
const webpack = require('webpack')
const config = require('../webpack.demo.config')()
const sitePages = require('../../../scripts/site-pages.js')

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
      setupMiddlewares(middlewares) {
        // Keep local content routes identical to the static production build.
        middlewares.unshift({
          name: 'site-pages',
          middleware(req, res, next) {
            const url = new URL(req.url, 'http://localhost')
            const pathname = url.pathname
            const page = pathname.split('/')[1]
            if (!sitePages.pageNames.includes(page)) return next()
            if (pathname === `/${page}`) {
              res.writeHead(308, { Location: `/${page}/${url.search}` })
              return res.end()
            }
            if (![`/${page}/`, `/${page}/index.html`].includes(pathname))
              return next()
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(sitePages.renderPage(page))
          },
        })
        return middlewares
      },
    },
    webpack({ ...config, mode: 'development' }),
  )
  server.start().then(() => {
    console.log(`Demo: http://127.0.0.1:${process.env.DEMO_PORT || 3002}/demo/`)
  })
}
