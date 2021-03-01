module.exports = {
  preset: 'jest-playwright-preset',
  testRegex: './*\\.test\\.ts$',
  setupFilesAfterEnv: ['./setup.js'],
  transform: {
    '^.+\\.(ts)$': 'ts-jest',
  },
}
