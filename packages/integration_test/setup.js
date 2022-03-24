const toMatchImageSnapshot = require('jest-image-snapshot').toMatchImageSnapshot

expect.extend({ toMatchImageSnapshot })

jest.setTimeout(30000)
