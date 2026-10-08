const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin')
const glob = require('glob-all')
const extensionConfig = require('./webpack.config')

// This alias belongs only to this build. Extension bundles always use the real API.
module.exports = () => {
  const config = extensionConfig()
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
      rules: config.module.rules.map((rule) =>
        rule.loader === 'file-loader'
          ? {
              ...rule,
              type: 'javascript/auto',
              options: { ...rule.options, esModule: false },
            }
          : rule,
      ),
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
      process.env.NODE_ENV === 'production' &&
        new PurgeCSSPlugin({
          paths: () =>
            glob.sync(
              [`${__dirname}/src/js/**/*`, `${__dirname}/src/demo*.html`],
              { nodir: true },
            ),
          defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
        }),
      new HtmlWebpackPlugin({
        template: path.join(__dirname, 'src/demo.html'),
        filename: 'index.html',
        chunks: ['shell'],
      }),
      new HtmlWebpackPlugin({
        template: path.join(__dirname, 'src/demo-workspace.html'),
        filename: 'workspace.html',
        chunks: ['workspace'],
      }),
    ].filter(Boolean),
  }
}
