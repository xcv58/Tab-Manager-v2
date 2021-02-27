const path = require('path')

const extensionPath = path.join(__dirname, '..', '..', 'build_chrome')

const launch = {
  // Chrome Headless doesn't support extensions https://github.com/puppeteer/puppeteer/issues/659
  headless: false,
  executablePath: process.env.PUPPETEER_EXEC_PATH || undefined,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
}

module.exports = { launch }
