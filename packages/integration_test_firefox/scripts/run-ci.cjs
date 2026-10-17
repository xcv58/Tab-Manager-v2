/* eslint-disable @typescript-eslint/no-require-imports */
// This entry point opts in explicitly and rejects an accidentally skipped suite.
const { spawnSync } = require('node:child_process')
const { mkdirSync, readFileSync, rmSync } = require('node:fs')
const path = require('node:path')

const artifacts = path.resolve(
  process.env.FIREFOX_E2E_ARTIFACTS || '../../.tmp/firefox-e2e',
)
mkdirSync(artifacts, { recursive: true })
const reportPath = path.join(artifacts, 'results.json')
rmSync(reportPath, { force: true })
const result = spawnSync(
  process.execPath,
  [
    require.resolve('jest/bin/jest'),
    '--ci',
    '--runInBand',
    '--json',
    '--outputFile',
    reportPath,
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      FIREFOX_E2E: '1',
      FIREFOX_E2E_ARTIFACTS: artifacts,
    },
  },
)
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status || 1)
const report = JSON.parse(readFileSync(reportPath, 'utf8'))
if (
  !report.success ||
  report.numTotalTests === 0 ||
  report.numPassedTests !== report.numTotalTests ||
  report.numPendingTests !== 0 ||
  report.numTodoTests !== 0
) {
  throw new Error(
    'Firefox CI requires a nonempty, fully passing suite without skipped tests.',
  )
}
