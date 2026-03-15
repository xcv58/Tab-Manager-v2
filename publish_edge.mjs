import { readFile } from "node:fs/promises"

const productId = process.env.EDGE_PRODUCT_ID
const clientId = process.env.EDGE_CLIENT_ID
const apiKey = process.env.EDGE_API_KEY
const zipPath = "packages/extension/build/build_chrome.zip"
const notes =
  process.env.EDGE_SUBMISSION_NOTES ||
  "Automatic release: https://github.com/xcv58/Tab-Manager-v2/releases"

const HELP_TEXT = `Usage: pnpm publish:edge

Required environment variables:
  EDGE_PRODUCT_ID
  EDGE_CLIENT_ID
  EDGE_API_KEY
`

if (process.argv.includes("--help")) {
  console.log(HELP_TEXT)
  process.exit(0)
}

for (const [name, value] of Object.entries({
  EDGE_PRODUCT_ID: productId,
  EDGE_CLIENT_ID: clientId,
  EDGE_API_KEY: apiKey,
})) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
}

const headers = {
  Authorization: `ApiKey ${apiKey}`,
  "X-ClientID": clientId,
}

const packageBuffer = await readFile(zipPath)
const uploadResponse = await fetch(
  `https://api.addons.microsoftedge.microsoft.com/v1/products/${productId}/submissions/draft/package`,
  {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/zip",
    },
    body: packageBuffer,
  },
)

if (uploadResponse.status !== 202) {
  throw new Error(
    `Edge upload failed: ${JSON.stringify(await readResponse(uploadResponse))}`,
  )
}

const uploadOperationId = getOperationId(uploadResponse.headers.get("location"))
const uploadResult = await pollOperation({
  headers,
  url: `https://api.addons.microsoftedge.microsoft.com/v1/products/${productId}/submissions/draft/package/operations/${uploadOperationId}`,
  kind: "upload",
})

const publishResponse = await fetch(
  `https://api.addons.microsoftedge.microsoft.com/v1/products/${productId}/submissions`,
  {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "text/plain; charset=utf-8",
    },
    body: notes,
  },
)

if (publishResponse.status !== 202) {
  throw new Error(
    `Edge publish failed: ${JSON.stringify(await readResponse(publishResponse))}`,
  )
}

const publishOperationId = getOperationId(
  publishResponse.headers.get("location"),
)
const publishResult = await pollOperation({
  headers,
  url: `https://api.addons.microsoftedge.microsoft.com/v1/products/${productId}/submissions/operations/${publishOperationId}`,
  kind: "publish",
})

console.log(
  JSON.stringify(
    {
      uploadResult,
      publishResult,
    },
    null,
    2,
  ),
)

async function pollOperation({ headers, url, kind }) {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const response = await fetch(url, { headers })
    const result = await readResponse(response)
    if (!response.ok && response.status !== 202) {
      throw new Error(`Edge ${kind} status failed: ${JSON.stringify(result)}`)
    }
    if (result.status && result.status !== "InProgress") {
      if (result.status === "Failed") {
        throw new Error(`Edge ${kind} failed: ${JSON.stringify(result)}`)
      }
      return result
    }
    await sleep(10000)
  }
  throw new Error(`Timed out waiting for Edge ${kind} status`)
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

function getOperationId(locationHeader) {
  if (!locationHeader) {
    throw new Error("Edge API did not return an operation ID")
  }
  const parts = locationHeader.split("/").filter(Boolean)
  return parts[parts.length - 1]
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
