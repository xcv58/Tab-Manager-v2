import { cp, mkdir, realpath, rm, stat } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = path.join(root, 'dist/site')
const result = spawnSync('pnpm', ['build:demo'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status || 1)

// Sources stay in docs/ and the extension package. Only this deployable output
// combines the marketing site and the compiled, isolated demo.
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await cp(path.join(root, 'docs'), output, { recursive: true })
await cp(
  path.join(root, 'packages/extension/build/build_demo'),
  path.join(output, 'demo'),
  {
    recursive: true,
  },
)
for (const entry of ['index.html', 'demo/index.html', 'demo/workspace.html']) {
  if (!(await stat(path.join(output, entry))).isFile()) {
    throw new Error(`Website build is missing ${entry}`)
  }
}
process.stdout.write(`Website and demo built to ${await realpath(output)}\n`)
if (process.env.VERCEL) {
  process.stdout.write(
    `Website build directories: ${JSON.stringify({
      cwd: process.cwd(),
      root,
      initCwd: process.env.INIT_CWD,
      pwd: process.env.PWD,
      configuredOutput: process.env.VERCEL_PROJECT_SETTINGS_OUTPUT_DIRECTORY,
    })}\n`,
  )
}
