import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const extensionRoot = resolve(__dirname, '../../..')
const packageMetadata = JSON.parse(
  readFileSync(join(extensionRoot, 'package.json'), 'utf8'),
)

// Exercise the same CopyWebpackPlugin transform that writes the packaged file.
// Separate processes keep webpack's browser/environment caches isolated.
const generateManifest = `
  const fs = require('node:fs')
  const config = require('./webpack.config')()
  const plugin = config.plugins.find((plugin) =>
    plugin.patterns?.some((pattern) => pattern.to === 'manifest.json')
  )
  const pattern = plugin.patterns.find((pattern) => pattern.to === 'manifest.json')
  process.stdout.write(pattern.transform(fs.readFileSync(pattern.from)))
`

describe.each(['chrome', 'firefox'])('%s packaged manifest', (browser) => {
  test.each(['missing', 'stale'])(
    'retains package metadata when lifecycle variables are %s',
    (mode) => {
      const childEnv: NodeJS.ProcessEnv = {
        ...process.env,
        NODE_ENV: 'production',
        TARGET_BROWSER: browser,
      }
      delete childEnv.npm_package_description
      delete childEnv.npm_package_version
      if (mode === 'stale') {
        childEnv.npm_package_description = 'Outdated lifecycle description'
        childEnv.npm_package_version = '0.0.0'
      }

      const manifest = JSON.parse(
        execFileSync(process.execPath, ['-e', generateManifest], {
          cwd: extensionRoot,
          env: childEnv,
          encoding: 'utf8',
        }),
      )

      expect(manifest.description).toBe(packageMetadata.description)
      expect(manifest.version).toBe(packageMetadata.version)
      expect(manifest.description.length).toBeGreaterThan(0)
      expect(manifest.description.length).toBeLessThanOrEqual(132)
    },
  )
})
