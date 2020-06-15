const puppeteer = require('puppeteer')
const { launch } = require('./puppeteer.config')
const { getExtensionURL } = require('./util')

const init = async () => {
  const browser = await puppeteer.launch(launch)
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 })
  const extensionURL = await getExtensionURL(browser)
  await page.goto(extensionURL)
}

init()
