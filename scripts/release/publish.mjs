// Only the manually dispatched default-branch workflow invokes this publisher.
import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { compareVersions } from '../release-policy.mjs'
import { git, json, sha256 } from '../performance/records.mjs'
import {
  assert,
  repository,
  gh,
  request,
  pages,
  optionalRelease,
  uploadImmutable,
} from './github.mjs'
import {
  verifiedCandidate,
  validateCandidate,
  verifyPackages,
  hashPattern,
  requiredJobs,
} from './candidate.mjs'

export async function releasedCandidate(tag, directory, digest) {
  const release = await request(`releases/tags/${encodeURIComponent(tag)}`)
  assert(!release.draft && !release.prerelease, 'release must be published')
  const assets = await pages(`releases/${release.id}/assets`)
  async function download(name) {
    const asset = assets.find((item) => item.name === name)
    assert(
      asset && asset.uploader?.login === 'github-actions[bot]',
      `missing trusted release asset ${name}`,
    )
    const bytes = await request(`releases/assets/${asset.id}`, true)
    await writeFile(join(directory, name), bytes)
    return bytes
  }
  await mkdir(directory, { recursive: true })
  const bytes = await download('candidate.json')
  assert(
    hashPattern.test(digest) && sha256(bytes) === digest,
    'published candidate differs from approval',
  )
  const candidate = validateCandidate(JSON.parse(bytes))
  assert(
    candidate.source.tag === tag &&
      (await request(`commits/${encodeURIComponent(tag)}`)).sha ===
        candidate.source.commit,
    'published tag does not match candidate',
  )
  const publication = JSON.parse(await download('publication.json'))
  assert(
    publication.candidateSha256 === digest &&
      publication.commit === candidate.source.commit &&
      publication.checks?.length &&
      publication.checks.every((check) => check.conclusion === 'success'),
    'missing successful publication gate receipt',
  )
  for (const name of requiredJobs)
    assert(
      publication.checks.some(
        (check) =>
          (check.name === name || check.name.endsWith(` / ${name}`)) &&
          check.conclusion === 'success',
      ),
      `missing archived release gate ${name}`,
    )
  for (const file of candidate.files) await download(file.name)
  await verifyPackages(candidate, directory)
  return { candidate, release, publication }
}

async function main() {
  assert(
    process.env.GITHUB_REPOSITORY === repository &&
      process.env.GITHUB_REF_NAME === 'master',
    'publisher must run on the default branch',
  )
  const runId = process.env.CANDIDATE_RUN,
    digest = process.env.CANDIDATE_SHA256
  assert(
    /^\d+$/.test(runId || '') && hashPattern.test(digest || ''),
    'reviewed candidate run and SHA-256 are required',
  )
  const stores = (process.env.RELEASE_STORES || 'none').split(',')
  assert(
    stores.every((store) =>
      ['chrome', 'firefox', 'edge', 'none'].includes(store),
    ) &&
      new Set(stores).size === stores.length &&
      (!stores.includes('none') || stores.length === 1),
    'invalid store selection',
  )
  const directory = resolve('.tmp/publish-candidate')
  await mkdir(directory, { recursive: true })
  // Find a previously published release by the candidate's immutable build identity.
  // The normal path validates live CI. Retries can use durable release receipts
  // after Actions artifacts expire; they never rebuild application packages.
  const existing = (await pages('releases')).filter(
    (release) => !release.draft && !release.prerelease,
  )
  let saved
  for (const release of existing) {
    const asset = release.assets?.find((file) => file.name === 'candidate.json')
    if (!asset) continue
    const bytes = await request(`releases/assets/${asset.id}`, true)
    if (sha256(bytes) === digest) {
      saved = release
      break
    }
  }
  let candidate
  if (saved) {
    ;({ candidate } = await releasedCandidate(
      saved.tag_name,
      directory,
      digest,
    ))
    assert(
      String(candidate.build.runId) === runId,
      'published run differs from approval',
    )
  } else {
    const verified = await verifiedCandidate(runId, directory, digest)
    candidate = verified.candidate
    git([
      'merge-base',
      '--is-ancestor',
      candidate.source.commit,
      'origin/master',
    ])
    const tag = candidate.source.tag
    const draft = await optionalRelease(tag)
    assert(
      !draft ||
        (draft.draft && draft.target_commitish === candidate.source.commit),
      'release already exists with a different candidate',
    )
    for (const release of existing.filter((item) =>
      /^v\d+\.\d+\.\d+$/.test(item.tag_name),
    ))
      assert(
        compareVersions(candidate.source.version, release.tag_name.slice(1)) >
          0,
        'new release must exceed existing stable versions',
      )
    // Avoid accidentally reusing a moved or pre-existing tag.
    const refs = git(['ls-remote', '--tags', 'origin', `refs/tags/${tag}`])
    assert(
      !refs ||
        (draft &&
          (await request(`commits/${tag}`)).sha === candidate.source.commit),
      'tag already exists without the reviewed release',
    )
    const notes =
      process.env.RELEASE_NOTES ||
      git([
        'show',
        `${candidate.source.commit}:packages/extension/CHANGELOG.md`,
      ])
        .split(/\n## /)
        .slice(0, 2)
        .join('\n## ')
    await writeFile(join(directory, 'notes.md'), notes)
    const publication = {
      schemaVersion: 1,
      commit: candidate.source.commit,
      candidateSha256: digest,
      recordedAt: new Date().toISOString(),
      publisherRun: process.env.GITHUB_RUN_ID,
      checks: verified.jobs
        .filter(
          (job) => job.conclusion === 'success' && !/Advisory/.test(job.name),
        )
        .map((job) => ({
          name: job.name,
          conclusion: job.conclusion,
          url: job.html_url,
        })),
      run: verified.run,
    }
    const savedPublication = draft?.assets?.find(
      (asset) => asset.name === 'publication.json',
    )
    assert(
      !savedPublication ||
        savedPublication.uploader?.login === 'github-actions[bot]',
      'draft publication receipt was not written by the trusted publisher',
    )
    const publicationBytes = savedPublication
      ? await request(`releases/assets/${savedPublication.id}`, true)
      : Buffer.from(json(publication))
    const savedReceipt = JSON.parse(publicationBytes)
    assert(
      savedReceipt.candidateSha256 === digest &&
        savedReceipt.commit === candidate.source.commit,
      'draft publication receipt conflicts',
    )
    await writeFile(join(directory, 'publication.json'), publicationBytes)
    // Draft first, upload every verified package, then publish. A later retry
    // recovers an incomplete draft by verifying its existing immutable files.
    if (!draft)
      gh([
        'release',
        'create',
        tag,
        '--draft',
        '--target',
        candidate.source.commit,
        '--title',
        tag,
        '--notes-file',
        join(directory, 'notes.md'),
        '--repo',
        repository,
      ])
    else if (process.env.RELEASE_NOTES)
      gh([
        'release',
        'edit',
        tag,
        '--notes-file',
        join(directory, 'notes.md'),
        '--repo',
        repository,
      ])
    for (const name of [
      'candidate.json',
      'publication.json',
      'SHA256SUMS.txt',
      ...candidate.files.map((file) => file.name),
    ])
      await uploadImmutable(tag, join(directory, name))
    gh(['release', 'edit', tag, '--draft=false', '--repo', repository])
  }
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `tag=${candidate.source.tag}\nchrome=${stores.includes('chrome')}\nfirefox=${stores.includes('firefox')}\nedge=${stores.includes('edge')}\n`,
  )
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `## ${candidate.source.tag}\n\nSource: ${candidate.source.commit}\n\nCandidate SHA-256: ${digest}\n\nRequested stores: ${stores.join(', ')}. Store review and availability are separate.\n`,
  )
}
if (process.argv[1] === import.meta.filename) await main()
