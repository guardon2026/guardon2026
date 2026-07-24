const path = require('path')
const standaloneDir = path.join(__dirname, '.next', 'standalone')
process.chdir(standaloneDir)
require(path.join(standaloneDir, 'server.js'))
