const path = require('path')

const srcPath = (subdir) => {
  return path.join(__dirname, '../../extension/src/js', subdir)
}

const alias = {
  background: srcPath('background'),
  components: srcPath('components'),
  libs: srcPath('libs'),
  stores: srcPath('stores'),
  svgIcons: srcPath('svgIcons'),
}

module.exports = {
  stories: [
    '../../extension/src/**/*.stories.mdx',
    '../../extension/src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    'storybook-addon-performance/register',
  ],
  webpackFinal: (config) => {
    Object.assign(config.resolve.alias, alias)
    return config
  },
}
