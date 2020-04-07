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

const TAB_QUERY = 'div[draggable="true"] div[tabindex="-1"]'

const ALL = async () => {
  const extensionURL = await getExtensionURL(browser)
  await page.goto(extensionURL)
}

const EACH = async () => {
  await page.bringToFront()
}

module.exports = { manifest, TAB_QUERY, ALL, EACH }
