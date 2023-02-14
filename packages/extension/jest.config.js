module.exports = {
  roots: ['<rootDir>/src/js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true, diagnostics: false }],
    '^.+\\.js$': ['ts-jest', { isolatedModules: true, diagnostics: false }],
  },
  testEnvironment: 'jsdom',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(t|j)sx?$',
  moduleDirectories: ['node_modules', 'src', 'src/js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!(react-dnd|dnd-core))'],
  moduleNameMapper: {
    '.+\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$':
      '<rootDir>/__mocks__/fileMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/src/js/test/setupTest.ts'],
  testEnvironmentOptions: {
    url: 'http://localhost/',
  },
  collectCoverage: true,
  coverageDirectory: './coverage/',
}
