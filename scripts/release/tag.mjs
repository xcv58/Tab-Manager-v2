import { git, repositoryRoot } from '../performance/records.mjs'
import { assert } from './github.mjs'
import { commitPattern } from './candidate.mjs'

export function assertReleaseRemote(cwd = repositoryRoot) {
  const fetchUrl = git(['remote', 'get-url', 'origin'], cwd)
  const pushUrls = git(
    ['remote', 'get-url', '--push', '--all', 'origin'],
    cwd,
  ).split('\n')
  assert(
    [fetchUrl, ...pushUrls].every((url) =>
      /^(?:git@github\.com:|https:\/\/github\.com\/|ssh:\/\/git@github\.com\/)xcv58\/Tab-Manager-v2(?:\.git)?$/i.test(
        url,
      ),
    ),
    'origin must point to the release repository for fetching and every push destination before pushing a version tag',
  )
  assert(
    pushUrls.length === 1,
    'origin must have exactly one release push destination',
  )
  // Keep using this remote: passing an expanded URL back to Git can apply URL
  // rewrites again. Its fetch and sole push destination identify the same repo.
}

export function remoteTagCommit(tag, cwd = repositoryRoot) {
  assert(/^v\d+\.\d+\.\d+$/.test(tag), 'invalid release tag')
  const ref = `refs/tags/${tag}`
  const output = git(['ls-remote', '--tags', 'origin', ref, `${ref}^{}`], cwd)
  if (!output) return null
  const refs = new Map(
    output.split('\n').map((line) => {
      const [sha, name] = line.split(/\s+/)
      assert(
        commitPattern.test(sha) && [ref, `${ref}^{}`].includes(name),
        'invalid remote tag response',
      )
      return [name, sha]
    }),
  )
  return refs.get(`${ref}^{}`) || refs.get(ref)
}

export function assertReleaseTag(source, cwd = repositoryRoot) {
  assert(commitPattern.test(source.commit), 'invalid release source')
  assert(
    remoteTagCommit(source.tag, cwd) === source.commit,
    'release tag is missing or differs from the reviewed source; use the approved local release:publish command',
  )
}

// Caller verifies approval, packages, gates and repository before this mutation.
// Push the final tag directly; never rewrite a local tag or force a remote tag.
export function pushReleaseTag(source, cwd = repositoryRoot) {
  assert(commitPattern.test(source.commit), 'invalid release source')
  const existing = remoteTagCommit(source.tag, cwd)
  if (existing) {
    assert(
      existing === source.commit,
      'release tag already points to a different commit',
    )
    return false
  }
  git(['fetch', '--no-tags', 'origin', source.commit], cwd)
  try {
    git(
      [
        'push',
        '--no-follow-tags',
        'origin',
        `${source.commit}:refs/tags/${source.tag}`,
      ],
      cwd,
    )
  } catch (error) {
    // A concurrent identical push is reusable; every conflicting tag is fatal.
    if (remoteTagCommit(source.tag, cwd) !== source.commit) throw error
  }
  assertReleaseTag(source, cwd)
  return true
}
