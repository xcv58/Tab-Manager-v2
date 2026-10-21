import { spawnSync } from 'node:child_process'

// Prefer a real release tag once it is newer than the manual bootstrap point.
// This avoids replaying old notes after a withdrawn tag, without pinning every
// future release to the same commit as last-release-sha would do.
export function resolveReleaseBaseline(ref = 'HEAD', cwd = process.cwd()) {
  const git = (args, optional = false) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' })
    if (result.error) throw result.error
    if (result.status !== 0 && !optional)
      throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`)
    return result
  }
  git(['rev-parse', '--verify', `${ref}^{commit}`])
  let configResult = git(['show', `${ref}:release-config.json`], true)
  // Historical refs still carry the old bootstrap configuration.
  if (configResult.status !== 0)
    configResult = git(['show', `${ref}:release-please-config.json`], true)
  const config =
    configResult.status === 0 ? JSON.parse(configResult.stdout) : {}
  const bootstrap = config['bootstrap-sha']
  const tag = git(
    ['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*', ref],
    true,
  ).stdout.trim()
  if (!bootstrap) {
    if (tag) return tag
    throw new Error('No release tag or manual bootstrap-sha is available.')
  }
  if (!/^[a-f0-9]{40}$/.test(bootstrap))
    throw new Error('bootstrap-sha must be a full commit SHA.')
  const isAncestor = (from, to) => {
    const result = git(['merge-base', '--is-ancestor', from, to], true)
    if (result.status !== 0 && result.status !== 1)
      throw new Error(result.stderr.trim() || 'Cannot resolve release history.')
    return result.status === 0
  }
  if (!isAncestor(bootstrap, ref))
    throw new Error(
      'The manual release baseline is not an ancestor of this ref.',
    )
  if (!tag || isAncestor(tag, bootstrap)) return bootstrap
  if (isAncestor(bootstrap, tag)) return tag
  throw new Error(
    'The release tag and manual baseline have divergent histories.',
  )
}
