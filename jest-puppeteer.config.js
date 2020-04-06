const path = require('path')

const extensionPath = path.join(__dirname, 'build')

module.exports = {
  launch: {
    // headless: process.env.HEADLESS !== 'false',
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  }
}
