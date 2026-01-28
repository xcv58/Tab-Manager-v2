const fs = require('fs')
const path = require('path')

const manifestPath = path.resolve(
  'safari/Tab Manager v2/Tab Manager v2 Extension/Resources/manifest.json',
)

if (!fs.existsSync(manifestPath)) {
  console.error('Manifest file not found at:', manifestPath)
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

// Keys to remove for Safari
const keysToRemove = [
  'minimum_chrome_version',
  'browser_specific_settings',
  'offline_enabled',
  'omnibox',
]

// Clean permissions list
if (manifest.permissions) {
  manifest.permissions = manifest.permissions.filter(
    (p) =>
      !['management', 'history', 'contextualIdentities', 'tabGroups'].includes(
        p,
      ),
  )
}

keysToRemove.forEach((key) => {
  delete manifest[key]
})

// Write it back
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

console.log('Sanitized manifest.json for Safari.')
