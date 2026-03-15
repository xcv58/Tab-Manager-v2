import { createSign } from "node:crypto"
import { readFile } from "node:fs/promises"

const HELP_TEXT = `Usage: pnpm publish:chrome

Required environment variables:
  EXTENSION_ID
  CHROME_PUBLISHER_ID
  CHROME_SERVICE_ACCOUNT_JSON

Optional environment variables:
  CHROME_PUBLISH_TYPE
`

if (process.argv.includes("--help")) {
  console.log(HELP_TEXT)
  process.exit(0)
}

const extensionId = process.env.EXTENSION_ID
const publisherId = process.env.CHROME_PUBLISHER_ID
const serviceAccountJson = process.env.CHROME_SERVICE_ACCOUNT_JSON
const publishType = process.env.CHROME_PUBLISH_TYPE
const zipPath = "packages/extension/build/build_chrome.zip"

for (const [name, value] of Object.entries({
  EXTENSION_ID: extensionId,
  CHROME_PUBLISHER_ID: publisherId,
  CHROME_SERVICE_ACCOUNT_JSON: serviceAccountJson,
})) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
}

const serviceAccount = JSON.parse(serviceAccountJson)
const accessToken = await getAccessToken(serviceAccount)
const itemName = `publishers/${publisherId}/items/${extensionId}`
const zipBuffer = await readFile(zipPath)

const uploadResult = await fetchJson(
  `https://chromewebstore.googleapis.com/upload/v2/${itemName}:upload`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/zip",
    },
    body: zipBuffer,
  },
)

const publishBody = publishType ? { publishType } : {}
const publishResult = await fetchJson(
  `https://chromewebstore.googleapis.com/v2/${itemName}:publish`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(publishBody),
  },
)

const statusResult = await fetchJson(
  `https://chromewebstore.googleapis.com/v2/${itemName}:fetchStatus`,
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  },
)

console.log(
  JSON.stringify(
    {
      uploadResult,
      publishResult,
      statusResult,
    },
    null,
    2,
  ),
)

async function getAccessToken(serviceAccount) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + 3600
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: serviceAccount.private_key_id,
  }
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/chromewebstore",
    aud: "https://oauth2.googleapis.com/token",
    iat: issuedAt,
    exp: expiresAt,
  }
  const unsignedToken = `${toBase64Url(header)}.${toBase64Url(payload)}`
  const signer = createSign("RSA-SHA256")
  signer.update(unsignedToken)
  signer.end()
  const signature = signer.sign(serviceAccount.private_key, "base64")
  const assertion = `${unsignedToken}.${toBase64Url(signature, true)}`

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  })

  const result = await readResponse(response)
  if (!response.ok || !result.access_token) {
    throw new Error(
      `Failed to obtain Chrome access token: ${JSON.stringify(result)}`,
    )
  }
  return result.access_token
}

async function fetchJson(url, init) {
  const response = await fetch(url, init)
  const result = await readResponse(response)
  if (!response.ok) {
    throw new Error(`Chrome Web Store request failed: ${JSON.stringify(result)}`)
  }
  return result
}

async function readResponse(response) {
  const text = await response.text()
  if (!text) {
    return {}
  }
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

function toBase64Url(value, isBase64 = false) {
  const base64 = isBase64
    ? value
    : Buffer.from(JSON.stringify(value)).toString("base64")
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}
