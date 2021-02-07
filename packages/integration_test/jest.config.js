module.exports = {
  preset: 'jest-puppeteer',
  setupFilesAfterEnv: ['expect-puppeteer', './setup.js'],
  testRegex: './*\\.test\\.js$',
}
