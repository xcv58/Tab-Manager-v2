import { spawnSync } from 'node:child_process'

const HELP_TEXT = `Usage: node scripts/audit-release-please-releasability.mjs [options]

Summarize which commits since the latest release tag are likely to affect the
extension package release managed by release-please.

Options:
  --from-ref REF       Analyze commits after REF. Defaults to latest v* tag.
  --to-ref REF         Analyze commits up to REF. Defaults to HEAD.
  --package-path PATH  Package path to inspect. Defaults to packages/extension.
  --help               Show this help text.
`

const CONVENTIONAL_COMMIT_PATTERN =
  /^(?<type>[a-z]+)(\((?<scope>[^)]+)\))?(?<breaking>!)?: (?<description>.+)$/

const options = parseArgs(process.argv.slice(2))

if (options.help) {
  console.log(HELP_TEXT)
  process.exit(0)
}

const toRef = options.toRef || 'HEAD'
const fromRef = options.fromRef || resolveLatestTag(toRef)
const commits = listCommits(fromRef, toRef)
const analyzedCommits = commits.map((commit) =>
  analyzeCommit(commit, options.packagePath),
)

const conventionalPackageCommits = analyzedCommits.filter(
  (commit) => commit.touchesPackage && commit.conventional,
)
const nonConventionalPackageCommits = analyzedCommits.filter(
  (commit) => commit.touchesPackage && !commit.conventional,
)
const nonPackageCommits = analyzedCommits.filter(
  (commit) => !commit.touchesPackage,
)

console.log(`Release window: ${fromRef}..${toRef}`)
console.log(`Package path: ${options.packagePath}`)
console.log('')

printCommitGroup(
  'Conventional commits touching the package',
  conventionalPackageCommits,
)
printCommitGroup(
  'Non-conventional commits touching the package',
  nonConventionalPackageCommits,
)
printCommitGroup('Commits outside the package path', nonPackageCommits)

if (nonConventionalPackageCommits.length > 0) {
  console.log('')
  console.log('Suggested BEGIN_COMMIT_OVERRIDE blocks (review before pasting):')

  for (const commit of nonConventionalPackageCommits) {
    console.log('')
    console.log(
      `- ${shortSha(commit.sha)} ${commit.subject}${
        commit.pullRequestNumber ? ` [PR #${commit.pullRequestNumber}]` : ''
      }`,
    )
    console.log('```txt')
    console.log('BEGIN_COMMIT_OVERRIDE')
    for (const line of commit.suggestedOverrideLines) {
      console.log(line)
    }
    console.log('END_COMMIT_OVERRIDE')
    console.log('```')
  }
}

function parseArgs(argv) {
  const result = {
    fromRef: '',
    help: false,
    packagePath: 'packages/extension',
    toRef: '',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--help') {
      result.help = true
      continue
    }
    if (arg === '--from-ref') {
      result.fromRef = expectValue(argv, ++index, '--from-ref')
      continue
    }
    if (arg === '--to-ref') {
      result.toRef = expectValue(argv, ++index, '--to-ref')
      continue
    }
    if (arg === '--package-path') {
      result.packagePath = expectValue(argv, ++index, '--package-path')
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return result
}

function expectValue(argv, index, flagName) {
  const value = argv[index]
  if (!value) {
    throw new Error(`Missing value for ${flagName}`)
  }
  return value
}

function resolveLatestTag(ref) {
  return runGit([
    'describe',
    '--tags',
    '--abbrev=0',
    '--match',
    'v*',
    ref,
  ]).trim()
}

function listCommits(fromRef, toRef) {
  const separator = '\u001f'
  const recordSeparator = '\u001e'
  const output = runGit([
    'log',
    '--reverse',
    `--format=%H${separator}%s${separator}%b${recordSeparator}`,
    `${fromRef}..${toRef}`,
  ])

  return output
    .split(recordSeparator)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [sha, subject, body = ''] = record.split(separator)
      return { body: body.trim(), sha, subject: subject.trim() }
    })
}

function analyzeCommit(commit, packagePath) {
  const files = listCommitFiles(commit.sha)
  const touchesPackage = files.some((file) =>
    file.startsWith(`${packagePath}/`),
  )
  const conventional = CONVENTIONAL_COMMIT_PATTERN.test(commit.subject)

  return {
    ...commit,
    conventional,
    files,
    pullRequestNumber: extractPullRequestNumber(commit.subject),
    suggestedOverrideLines: conventional
      ? []
      : buildSuggestedOverrideLines(commit),
    touchesPackage,
  }
}

function listCommitFiles(sha) {
  return runGit(['show', '--format=', '--name-only', sha])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function extractPullRequestNumber(subject) {
  const match = subject.match(/\(#(?<number>\d+)\)$/)
  return match?.groups?.number || ''
}

function buildSuggestedOverrideLines(commit) {
  const normalizedSubject = normalizeComparisonText(
    stripPullRequestSuffix(commit.subject),
  )
  const bulletLines = commit.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('* '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean)
    .filter((line) => {
      const normalizedLine = normalizeComparisonText(line)
      return (
        normalizedLine !== normalizedSubject &&
        !/^finish issue #\d+\b/i.test(line)
      )
    })

  const candidates =
    bulletLines.length > 0
      ? bulletLines
      : [stripPullRequestSuffix(commit.subject)]
  const lines = []
  const seen = new Set()

  for (const candidate of candidates) {
    const inferredLine = inferConventionalLine(candidate)
    if (!inferredLine || seen.has(inferredLine)) {
      continue
    }
    seen.add(inferredLine)
    lines.push(inferredLine)
  }

  if (lines.length > 0) {
    return lines
  }

  return ['fix: summarize the user-facing change for this merged PR']
}

function inferConventionalLine(text) {
  const cleaned = stripTrailingPunctuation(stripPullRequestSuffix(text.trim()))
  if (!cleaned) {
    return ''
  }
  if (CONVENTIONAL_COMMIT_PATTERN.test(cleaned)) {
    return cleaned
  }

  const [firstWord = ''] = cleaned.split(/\s+/, 1)
  const inferredType = inferType(firstWord)
  const description = buildDescription(cleaned, inferredType, firstWord)

  return `${inferredType}: ${description}`
}

function inferType(firstWord) {
  if (
    /^(add|allow|create|enable|implement|introduce|support)$/i.test(firstWord)
  ) {
    return 'feat'
  }
  if (/^(ci|cache)$/i.test(firstWord)) {
    return 'ci'
  }
  if (/^(clarify|document|docs?)$/i.test(firstWord)) {
    return 'docs'
  }
  if (/^(bump|move|refactor|remove|rename|update)$/i.test(firstWord)) {
    return 'chore'
  }
  return 'fix'
}

function stripPullRequestSuffix(text) {
  return text.replace(/\s+\(#\d+\)$/, '')
}

function stripTrailingPunctuation(text) {
  return text.replace(/[.:]+$/, '')
}

function lowerFirst(text) {
  return text.slice(0, 1).toLowerCase() + text.slice(1)
}

function normalizeComparisonText(text) {
  return stripTrailingPunctuation(text)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function buildDescription(text, inferredType, firstWord) {
  if (inferredType === 'fix' && /^fix$/i.test(firstWord)) {
    return lowerFirst(text.replace(/^fix\s+/i, '').trim())
  }

  return lowerFirst(text)
}

function shortSha(sha) {
  return sha.slice(0, 8)
}

function printCommitGroup(title, commits) {
  console.log(`${title}: ${commits.length}`)
  if (commits.length === 0) {
    return
  }

  for (const commit of commits) {
    const prSuffix = commit.pullRequestNumber
      ? ` [PR #${commit.pullRequestNumber}]`
      : ''
    console.log(`- ${shortSha(commit.sha)} ${commit.subject}${prSuffix}`)
  }
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })

  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed with exit code ${result.status}`,
    )
  }

  return result.stdout
}
