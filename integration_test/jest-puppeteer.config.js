const path = require('path')

const extensionPath = path.join(__dirname, '../build')

module.exports = {
  launch: {
    // Chrome Headless doesn't support extensions https://github.com/puppeteer/puppeteer/issues/659
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  }
}
