const childProcess = require('child_process')
const path = require('path')
const getPort = require('get-port')
const webExt = require('web-ext').default
const puppeteer = require('puppeteer')
console.log(webExt)

const sourceDir = path.join(__dirname, '../build_firefox')
const firefox = path.join(
  __dirname,
  '../node_modules/puppeteer/.local-firefox/mac-79.0a1/Firefox Nightly.app'
)

console.log({ sourceDir, firefox })
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
  // The command has finished. Each command resolves its
  // promise with a different value.
  console.log(extensionRunner)
  // You can do a few things like:
  // extensionRunner.reloadAllExtensions();
  // extensionRunner.exit();

  // Needed because `webExt.cmd.run` returns before the DevTools agent starts running.
  // Alternative would be to wrap the call to puppeteer.connect() with some custom retry logic
  console.log('before sleep')
  childProcess.execSync('sleep 2')
  console.log('after sleep')

  const browserURL = `http://localhost:${CDPPort}`
  // const browser = await puppeteer.launch({ headless: false, product: "firefox" })
  const browser = await puppeteer.connect({ browserURL })
  await browser.newPage('https://google.com')
  let page = await browser.newPage()
  await page.keyboard.down('Control')
  await page.keyboard.press('o')
  await page.keyboard.up('Control')
  console.log('new page')
  page = await browser.newPage()
  await page.goto('https://google.com')
})()
