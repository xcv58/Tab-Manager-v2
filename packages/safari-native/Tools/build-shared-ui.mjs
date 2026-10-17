import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../../', import.meta.url))
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
      'Debug',
      '-derivedDataPath',
      '.tmp/safari-native-derived',
      'clean',
      'build',
    ],
  ],
  [
    'codesign',
    [
      '--verify', '--deep', '--strict',
      '.tmp/safari-native-derived/Build/Products/Debug/TabManagerSafariPrototype.app',
    ],
  ],
]) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
console.log(
  'Safari app: ' +
    root +
    '.tmp/safari-native-derived/Build/Products/Debug/TabManagerSafariPrototype.app',
)
