import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../../', import.meta.url))
const configuration = process.env.SAFARI_BUILD_CONFIGURATION || 'Debug'
if (!['Debug', 'Release'].includes(configuration))
  throw new Error('SAFARI_BUILD_CONFIGURATION must be Debug or Release.')
const appPath =
  root +
  `.tmp/safari-native-derived/Build/Products/${configuration}/TabManagerSafariPrototype.app`
for (const [command, args] of [
  ['pnpm', ['--filter', './packages/extension', 'build:safari']],
  ['xcodegen', ['generate', '--spec', 'packages/safari-native/project.yml']],
  [
    'xcodebuild',
    [
      '-project',
      'packages/safari-native/TabManagerSafariPrototype.xcodeproj',
      '-scheme',
      'TabManagerSafariPrototype',
      '-configuration',
      configuration,
      '-derivedDataPath',
      '.tmp/safari-native-derived',
      'clean',
      'build',
    ],
  ],
  ['codesign', ['--verify', '--deep', '--strict', appPath]],
]) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
console.log('Safari app: ' + appPath)
