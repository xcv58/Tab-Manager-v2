const path = require('path')
const fs = require('fs')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin')
const glob = require('glob-all')
const extensionConfig = require('./webpack.config')

// This alias belongs only to this build. Extension bundles always use the real API.
module.exports = () => {
  const config = extensionConfig()
  const websiteRoot = path.resolve(__dirname, '../../docs')
  const website = fs.readFileSync(path.join(websiteRoot, 'index.html'), 'utf8')
  // The marketing page is the single source for the shared header markup.
  const header = website.match(
    /<header class="site-header[^"]*"[\s\S]*?<\/header>/,
  )?.[0]
  if (!header) throw new Error('The website header could not be found')
  const siteHeader = header
    .replace('site-header fade-in', 'site-header')
    .replace(/ aria-current="page"/g, '')
    .replace(/href="index.html"/g, 'href="../"')
    .replace('href="demo/"', 'href="./" aria-current="page"')
    .replace('href="#install"', 'href="../#install"')
    .replace('src="assets/images/logo.png"', 'src="./site/logo.png"')
  return {
    ...config,
    entry: {
      workspace: path.join(__dirname, 'src/js/demo.tsx'),
      shell: path.join(__dirname, 'src/js/demo-shell.ts'),
    },
    output: {
      ...config.output,
      path: path.join(__dirname, 'build/build_demo'),
      publicPath: './',
    },
    module: {
      ...config.module,
      rules: config.module.rules.map((rule) => {
        if (rule.loader === 'file-loader')
          return {
            ...rule,
            type: 'javascript/auto',
            options: { ...rule.options, esModule: false },
          }
        // Let HtmlWebpackPlugin render the shared header template. Its site
        // asset URLs refer to copied output files, not source modules.
        if (rule.loader === 'html-loader')
          return { ...rule, exclude: [rule.exclude, /demo\.html$/] }
        return rule
      }),
    },
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        'webextension-polyfill$': path.join(
          __dirname,
          'src/js/demo/browser.ts',
        ),
      },
    },
    plugins: [
      ...config.plugins.filter(
        (plugin) =>
          !(plugin instanceof CopyWebpackPlugin) &&
          !(plugin instanceof HtmlWebpackPlugin) &&
          !(plugin instanceof PurgeCSSPlugin),
      ),
      new CopyWebpackPlugin({
        patterns: [
          { from: path.join(websiteRoot, 'style.css'), to: 'site/style.css' },
          {
            from: path.join(websiteRoot, 'assets/site-shell.js'),
            to: 'site/site-shell.js',
          },
          {
            from: path.join(websiteRoot, 'assets/images/logo.png'),
            to: 'site/logo.png',
          },
        ],
      }),
      process.env.NODE_ENV === 'production' &&
        new PurgeCSSPlugin({
          paths: () =>
            glob.sync(
              [
                `${__dirname}/src/js/**/*`,
                `${__dirname}/src/demo*.html`,
                `${websiteRoot}/index.html`,
                `${websiteRoot}/assets/site-shell.js`,
              ],
              { nodir: true },
            ),
          defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
        }),
      new HtmlWebpackPlugin({
        template: path.join(__dirname, 'src/demo.html'),
        filename: 'index.html',
        chunks: ['shell'],
        templateParameters: { siteHeader },
      }),
      new HtmlWebpackPlugin({
        template: path.join(__dirname, 'src/demo-workspace.html'),
        filename: 'workspace.html',
        chunks: ['workspace'],
      }),
    ].filter(Boolean),
  }
}
