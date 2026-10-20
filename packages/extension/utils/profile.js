// Separate local profiling build; never included in extension/site entrypoints.
const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const Terser = require('terser-webpack-plugin')
const CssMinimizer = require('css-minimizer-webpack-plugin')
const sourceRoot = path.resolve(
  process.env.PROFILE_SOURCE_ROOT || path.join(__dirname, '..'),
)
process.chdir(sourceRoot)
const config = require(path.join(sourceRoot, 'webpack.config'))()
const sourcePackage = require(path.join(sourceRoot, 'package.json'))
const dependencyVersions = {}
for (const name of [
  'react',
  'react-dom',
  'mobx',
  'moment',
  'react-router-dom',
]) {
  const expected = sourcePackage.dependencies[name]
  if (!expected) continue
  const installed = require(
    require.resolve(`${name}/package.json`, { paths: [sourceRoot] }),
  ).version
  if (installed !== expected)
    throw new Error(
      `Profile dependency ${name}: expected ${expected}, found ${installed}`,
    )
  dependencyVersions[name] = installed
}
const assets = path.resolve(
  __dirname,
  '../../integration_test/assets/profiling',
)
// Use one simulated browser adapter for every frozen UI, including releases
// before the website demo existed. No application UI/store code is substituted.
const harnessSource = path.resolve(__dirname, '../src/js')
const demoRoot = path.join(harnessSource, 'demo')
const adapterData = {
  'components/Toolbar/SettingsPreviewData': path.join(
    assets,
    'settings-preview.ts',
  ),
  'libs/tabTooltip': path.join(harnessSource, 'libs/tabTooltip.ts'),
}
const output = path.resolve(
  process.env.PROFILE_OUTPUT ||
    path.join(__dirname, '../../..', '.tmp/performance/current'),
)
config.context = sourceRoot
config.entry = { profile: path.join(assets, 'entry.tsx') }
config.output = { ...config.output, path: output }
config.mode = 'production'
config.module.rules.forEach((rule) => {
  if (String(rule.test) === String(/\.(js|ts)x?$/)) {
    rule.include = [
      rule.include,
      assets,
      demoRoot,
      ...Object.values(adapterData),
    ]
    rule.use[0].options.configFile = path.join(sourceRoot, 'tsconfig.json')
  }
})
config.resolve.alias['react$'] = require.resolve('react', {
  paths: [sourceRoot],
})
config.resolve.alias['react-dom/client$'] = require.resolve(
  'react-dom/profiling',
  { paths: [sourceRoot] },
)
config.resolve.alias['react-dom$'] = require.resolve('react-dom/profiling', {
  paths: [sourceRoot],
})
config.resolve.modules = [
  path.join(sourceRoot, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
  'node_modules',
]
config.resolve.alias['webextension-polyfill$'] = path.join(
  demoRoot,
  'browser.ts',
)
config.plugins = config.plugins.filter(
  (plugin) =>
    !(plugin instanceof HtmlWebpackPlugin) &&
    !(plugin instanceof CopyWebpackPlugin),
)
config.plugins.push(
  new webpack.DefinePlugin({
    __PROFILE_BUILD__: JSON.stringify({
      revision: process.env.PROFILE_REVISION || 'working-tree',
      dependencyVersions,
    }),
  }),
  new webpack.NormalModuleReplacementPlugin(
    /^\.\.\/\.\.\/\.\.\/extension\/src\//,
    (resource) => {
      const relative = resource.request.split('/extension/src/')[1]
      resource.request = relative.startsWith('js/demo/')
        ? path.join(harnessSource, relative.slice(3))
        : path.join(sourceRoot, 'src', relative)
    },
  ),
  new webpack.NormalModuleReplacementPlugin(/^\.\/fixtures$/, (resource) => {
    if (resource.context === demoRoot) {
      resource.request = path.join(assets, 'fixtures.ts')
    }
  }),
  new webpack.NormalModuleReplacementPlugin(
    /^(components\/Toolbar\/SettingsPreviewData|libs\/tabTooltip|\.\.\/libs|\.\.\/background\/TabHistory)$/,
    (resource) => {
      if (resource.context !== demoRoot) return
      resource.request =
        adapterData[resource.request] ||
        path.join(sourceRoot, 'src/js', resource.request.slice(3))
    },
  ),
  new HtmlWebpackPlugin({ template: path.join(assets, 'index.html') }),
)
config.optimization = { minimizer: [new Terser(), new CssMinimizer()] }
webpack(config, (error, stats) => {
  if (error || stats.hasErrors()) {
    console.error(error || stats.toString({ all: false, errors: true }))
    process.exitCode = 1
    return
  }
  fs.mkdirSync(output, { recursive: true })
  console.log(stats.toString({ all: false, assets: true, timings: true }))
})
