const fs = require('fs')
const path = require('path')

const alias = {}
const jsEntry = '../../extension/src/js'
Object.assign(
  alias,
  ...fs
    .readdirSync(path.join(__dirname, jsEntry), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .map((entry) => ({ [entry]: path.join(__dirname, jsEntry, entry) }))
)

module.exports = {
  stories: [
    '../../extension/**/*.stories.mdx',
    '../../extension/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  core: {
    builder: 'webpack5',
  },
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
  ],
  webpackFinal: (config) => {
    Object.assign(config.resolve.alias, alias)
    return config
  },
}
