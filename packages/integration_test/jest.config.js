module.exports = {
  preset: 'jest-playwright-preset',
  testRegex: './*\\.test\\.ts$',
  setupFilesAfterEnv: ['expect-puppeteer', './setup.js'],
  transform: {
    '^.+\\.(ts)$': 'ts-jest',
  },
}
