// Only data imports may bypass application verification. Unknown ranges fail open
// toward full CI; required checks still get a successful report-only job.
import { appendFile, readFile } from 'node:fs/promises'
import { git } from '../performance/records.mjs'
let application = true
const compare = process.argv[2]
if (compare && /^[a-f0-9]{40}$/.test(compare) && !/^0+$/.test(compare)) {
  try {
    const paths = git(['diff', '--name-only', compare, 'HEAD'])
      .split('\n')
      .filter(Boolean)
    application =
      !paths.length ||
      paths.some(
        (path) => !/^notes\/(release-reports\/|performance\/runs\/)/.test(path),
      )
  } catch {
    /* missing parent or shallow checkout: run full verification */
  }
} else if (process.env.GITHUB_EVENT_PATH) {
  const event = JSON.parse(
    await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'),
  )
  if (
    event.before &&
    /^[a-f0-9]{40}$/.test(event.before) &&
    !/^0+$/.test(event.before)
  ) {
    try {
      const paths = git(['diff', '--name-only', event.before, 'HEAD'])
        .split('\n')
        .filter(Boolean)
      application =
        !paths.length ||
        paths.some(
          (path) =>
            !/^notes\/(release-reports\/|performance\/runs\/)/.test(path),
        )
    } catch {
      /* run full verification */
    }
  }
}
if (process.env.GITHUB_OUTPUT)
  await appendFile(process.env.GITHUB_OUTPUT, `application=${application}\n`)
process.stdout.write(application ? 'application\n' : 'reports-only\n')
