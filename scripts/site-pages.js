const fs = require('node:fs')
const path = require('node:path')

const websiteRoot = path.resolve(__dirname, '../docs')
const pageNames = ['privacy', 'support']

// The main page is the single source of header markup for every site route.
function renderHeader(page, { logo = '../assets/images/logo.png' } = {}) {
  const website = fs.readFileSync(path.join(websiteRoot, 'index.html'), 'utf8')
  const header = website.match(
    /<header class="site-header[^"]*"[\s\S]*?<\/header>/,
  )?.[0]
  if (!header) throw new Error('The website header could not be found')
  const links = {
    overview: '../',
    demo: page === 'demo' ? './' : '../demo/',
    install: '../#install',
    privacy: page === 'privacy' ? './' : '../privacy/',
    support: page === 'support' ? './' : '../support/',
  }
  return header
    .replace('site-header fade-in', 'site-header')
    .replace(/ aria-current="page"/g, '')
    .replace(/href="index.html"/g, 'href="../"')
    .replace(/href="[^"]*" data-site-link="([^"]*)"/g, (_, key) => {
      if (!links[key]) throw new Error(`Unknown site link: ${key}`)
      return `href="${links[key]}" data-site-link="${key}"${key === page ? ' aria-current="page"' : ''}`
    })
    .replace('src="assets/images/logo.png"', `src="${logo}"`)
}

function renderPage(page) {
  if (!pageNames.includes(page)) throw new Error(`Unknown site page: ${page}`)
  const source = fs.readFileSync(
    path.join(websiteRoot, page, 'index.html'),
    'utf8',
  )
  if (!source.includes('<!-- site-header -->')) {
    throw new Error(`Missing shared header placeholder in ${page}`)
  }
  return source.replace('<!-- site-header -->', renderHeader(page))
}

module.exports = { pageNames, renderHeader, renderPage }
