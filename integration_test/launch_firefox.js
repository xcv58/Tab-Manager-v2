const childProcess = require('child_process')
const path = require('path')
const getPort = require('get-port')
const webExt = require('web-ext').default
const puppeteer = require('puppeteer')

const sourceDir = path.join(__dirname, '../build_firefox')
const firefox = path.join(
  __dirname,
  '../node_modules/puppeteer/.local-firefox/mac-79.0a1/Firefox Nightly.app'
)

const openPage = async (browser, url) => {
  const page = await browser.newPage()
  await page.goto(url)
  return page
}

;(async () => {
  const CDPPort = await getPort()
  const args = [`--remote-debugger=localhost:${CDPPort}`]
  const extensionRunner = await webExt.cmd.run(
    {
      sourceDir,
      firefox,
      args
    },
    {
      shouldExitProgram: false
    }
  )
  // The command has finished. Each command resolves its promise with a different value.
  // You can do a few things like:
  extensionRunner.reloadAllExtensions()
  // extensionRunner.exit();

  // Needed because `webExt.cmd.run` returns before the DevTools agent starts running.
  // Alternative would be to wrap the call to puppeteer.connect() with some custom retry logic
  childProcess.execSync('sleep 2')

  const browserURL = `http://localhost:${CDPPort}`
  const browser = await puppeteer.connect({ browserURL })
  let page = await openPage(browser, 'https://google.com')
  await page.keyboard.press('Tab')
  await page.keyboard.down('Control')
  await page.keyboard.press('o')
  await page.keyboard.up('Control')
  // When it open new tab, the old one would execute until the tab is active
  page = await openPage(browser, 'https://google.com')
})()
