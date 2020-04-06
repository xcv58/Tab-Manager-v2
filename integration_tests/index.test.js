const manifest = require('../src/manifest.json')

const getExtensionURL = async (browser) => {
  const extensionId = await getExtensionId(browser)
  return `chrome-extension://${extensionId}/popup.html?not_popup=1`
}

const getExtensionId = async (browser) => {
  const targets = await browser.targets()
  const extensionTarget = targets.find(({ _targetInfo }) => {
    return (
      _targetInfo.title === manifest.name &&
      _targetInfo.type === 'background_page'
    )
  })
  const extensionUrl = extensionTarget._targetInfo.url || ''
  const [, , extensionId] = extensionUrl.split('/')
  return extensionId
}

describe('The Extension page should', () => {
  beforeAll(async () => {
    const extensionURL = await getExtensionURL(browser)
    await page.goto(extensionURL)
  })

  it('have title ends with the extension name', async () => {
    await expect(page.title()).resolves.toMatch(manifest.name)
  })
})
