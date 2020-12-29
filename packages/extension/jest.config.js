module.exports = {
  globals: {
    'ts-jest': {
      isolatedModules: true,
      diagnostics: false,
    },
  },
  roots: ['<rootDir>/src/js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.js$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(t|j)sx?$',
  moduleDirectories: ['node_modules', 'src', 'src/js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!(react-dnd|dnd-core))'],
  moduleNameMapper: {
    '.+\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$': 'babel-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/src/js/test/setupTest.ts'],
  testURL: 'http://localhost/',
  collectCoverage: true,
  coverageDirectory: './coverage/',
}
