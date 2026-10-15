// Regenerate the bundled PNG favicons from their SVG monogram sources.
import { mkdirSync, writeFileSync } from 'node:fs'
import { URL, fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { SAMPLE_SITES, captureIconSvg } from './capture-sites.mjs'

const output = fileURLToPath(
  new URL('../assets/capture-sites/icons', import.meta.url),
)
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({
  executablePath: process.env.TMV2_TEST_BROWSER_PATH || undefined,
  headless: true,
})
try {
  const page = await browser.newPage({
    viewport: { width: 64, height: 64 },
    deviceScaleFactor: 1,
  })
  for (const host of new Set(
    Object.values(SAMPLE_SITES).map((site) => new URL(site.url).hostname),
  )) {
    const svg = captureIconSvg(host)
    writeFileSync(join(output, `${host}.svg`), svg)
    await page.setContent(`<style>body{margin:0}</style>${svg}`)
    await page
      .locator('svg')
      .screenshot({ path: join(output, `${host}.png`), omitBackground: true })
  }
} finally {
  await browser.close()
}
