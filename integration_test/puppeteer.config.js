const path = require('path')

// const extensionPath = path.join(__dirname, '../build_chrome')
const extensionPath = path.join(__dirname, '../build_firefox')

const launch = {
  // Chrome Headless doesn't support extensions https://github.com/puppeteer/puppeteer/issues/659
  headless: false,
  product: 'firefox',
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`
  ]
}

module.exports = { launch }
