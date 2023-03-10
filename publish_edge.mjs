import { EdgeAddonsAPI } from "@plasmohq/edge-addons-api"

const productId = process.env.EDGE_PRODUCT_ID
const clientId = process.env.EDGE_CLIENT_ID
const clientSecret = process.env.EDGE_CLIENT_SECRET
const accessTokenUrl = process.env.EDGE_ACCESS_TOKEN_URL

const client = new EdgeAddonsAPI({
  productId,
  clientId,
  clientSecret,
  accessTokenUrl
})

await client.submit({
  filePath: "packages/extension/build/build_chrome.zip",
  notes: "Automatic release: https://github.com/xcv58/Tab-Manager-v2/releases",
})
