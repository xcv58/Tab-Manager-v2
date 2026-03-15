import { existsSync, readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"

const HELP_TEXT = `Usage: node scripts/sync-release-secrets-to-github.mjs [--env-file PATH] [--repo OWNER/REPO]

Reads local release credentials from a gitignored env file and pushes them to
GitHub Actions secrets.

Options:
  --env-file PATH   Path to the local env file. Defaults to .env.release.local
  --repo OWNER/REPO Override the target GitHub repository.
  --help            Show this help text.
`

const options = parseArgs(process.argv.slice(2))

if (options.help) {
  console.log(HELP_TEXT)
  process.exit(0)
}

const envFilePath = path.resolve(process.cwd(), options.envFile)
if (!existsSync(envFilePath)) {
  throw new Error(
    `Missing env file: ${envFilePath}. Copy .env.release.example to .env.release.local first.`,
  )
}

const envValues = parseEnvFile(readFileSync(envFilePath, "utf8"))
const serviceAccountPath = envValues.CHROME_SERVICE_ACCOUNT_JSON_FILE
  ? path.resolve(path.dirname(envFilePath), envValues.CHROME_SERVICE_ACCOUNT_JSON_FILE)
  : ""

const requiredVars = [
  "RELEASE_PLEASE_TOKEN",
  "EXTENSION_ID",
  "CHROME_PUBLISHER_ID",
  "WEB_EXT_API_KEY",
  "WEB_EXT_API_SECRET",
  "EDGE_PRODUCT_ID",
  "EDGE_CLIENT_ID",
  "EDGE_API_KEY",
]

for (const name of requiredVars) {
  if (!envValues[name]) {
    throw new Error(`Missing required value in ${envFilePath}: ${name}`)
  }
}

if (!serviceAccountPath) {
  throw new Error(
    `Missing required value in ${envFilePath}: CHROME_SERVICE_ACCOUNT_JSON_FILE`,
  )
}

if (!existsSync(serviceAccountPath)) {
  throw new Error(
    `Chrome service account JSON file not found: ${serviceAccountPath}`,
  )
}

const githubSecrets = {
  RELEASE_PLEASE_TOKEN: envValues.RELEASE_PLEASE_TOKEN,
  EXTENSION_ID: envValues.EXTENSION_ID,
  CHROME_PUBLISHER_ID: envValues.CHROME_PUBLISHER_ID,
  CHROME_SERVICE_ACCOUNT_JSON: readFileSync(serviceAccountPath, "utf8"),
  WEB_EXT_API_KEY: envValues.WEB_EXT_API_KEY,
  WEB_EXT_API_SECRET: envValues.WEB_EXT_API_SECRET,
  EDGE_PRODUCT_ID: envValues.EDGE_PRODUCT_ID,
  EDGE_CLIENT_ID: envValues.EDGE_CLIENT_ID,
  EDGE_API_KEY: envValues.EDGE_API_KEY,
}

if (envValues.CHROME_PUBLISH_TYPE) {
  githubSecrets.CHROME_PUBLISH_TYPE = envValues.CHROME_PUBLISH_TYPE
}

runGh(["auth", "status"])

for (const [name, value] of Object.entries(githubSecrets)) {
  const args = ["secret", "set", name]
  if (options.repo) {
    args.push("--repo", options.repo)
  }
  console.log(`Setting GitHub Actions secret ${name}`)
  runGh(args, value)
}

console.log("Release secrets uploaded successfully.")

function parseArgs(argv) {
  const result = {
    envFile: ".env.release.local",
    help: false,
    repo: "",
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--help") {
      result.help = true
      continue
    }
    if (arg === "--env-file") {
      result.envFile = expectValue(argv, ++index, "--env-file")
      continue
    }
    if (arg === "--repo") {
      result.repo = expectValue(argv, ++index, "--repo")
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

function parseEnvFile(contents) {
  const values = {}

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) {
      continue
    }
    const separatorIndex = line.indexOf("=")
    if (separatorIndex === -1) {
      continue
    }
    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    values[key] = value
  }

  return values
}

function runGh(args, stdinText = "") {
  const result = spawnSync("gh", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    input: stdinText,
    stdio: ["pipe", "inherit", "inherit"],
  })

  if (result.status !== 0) {
    throw new Error(`gh ${args.join(" ")} failed with exit code ${result.status}`)
  }
}
