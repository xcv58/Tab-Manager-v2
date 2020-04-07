module.exports = {
  preset: 'jest-puppeteer',
  setupFilesAfterEnv: ['expect-puppeteer'],
  testRegex: './*\\.test\\.js$'
}
