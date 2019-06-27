module.exports = {
  globals: {
    'ts-jest': {
      diagnostics: false
    }
  },
  roots: ['<rootDir>/src/js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(t|j)sx?$',
  moduleDirectories: ['node_modules', 'src', 'src/js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '.+\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$': 'babel-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/src/js/test/setupEnzyme.ts']
}
