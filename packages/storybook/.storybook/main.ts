import type { StorybookConfig } from '@storybook/react-webpack5'
import fs from 'fs'
import path from 'path'

import { join, dirname } from 'path'

const alias = {}
const jsEntry = '../../extension/src/js'
Object.assign(
  alias,
  ...fs
    .readdirSync(path.join(__dirname, jsEntry), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .map((entry) => ({ [entry]: path.join(__dirname, jsEntry, entry) })),
)

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')))
}
const config: StorybookConfig = {
  stories: [
    '../../extension/src/**/*.mdx',
    '../../extension/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@storybook/addon-onboarding'),
    getAbsolutePath('@storybook/addon-interactions'),
  ],
  webpackFinal: (config) => {
    if (config.resolve && config.resolve.alias) {
      Object.assign(config.resolve.alias, alias)
    }
    return config
  },
  framework: {
    name: getAbsolutePath('@storybook/react-webpack5'),
    options: {
      builder: {
        useSWC: true,
      },
    },
  },
  docs: {
    autodocs: 'tag',
  },
}
export default config
