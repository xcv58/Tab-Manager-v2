// you can use this file to add your custom webpack plugins, loaders and anything you like.
// This is just the basic way to add additional webpack configurations.
// For more information refer the docs: https://storybook.js.org/configurations/custom-webpack-config

// IMPORTANT
// When you add this file, we won't add the default configurations which is similar
// to "React Create App". This only has babel loader to load JavaScript.
const config = require('../webpack.config')

module.exports = (storybookBaseConfig, configType) => {
  if (configType === 'PRODUCTION') {
    // see https://github.com/storybooks/storybook/issues/1570
    storybookBaseConfig.plugins = storybookBaseConfig.plugins.filter(plugin => plugin.constructor.name !== 'UglifyJsPlugin')
  }

  storybookBaseConfig.module = config.module
  return storybookBaseConfig
}
