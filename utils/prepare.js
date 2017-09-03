const fileSystem = require('fs-extra')
const path = require('path')

// clean de dist folder
fileSystem.emptyDirSync(path.join(__dirname, '../build'))

require('./generate_manifest')
