import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const source = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../../../safari-native/WebExtension/read-icon.js',
  ),
  'utf8',
)
afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

it('returns URL-bound head icon metadata without reading body links or changing the page', () => {
  document.head.innerHTML =
    '<link rel="stylesheet" href="/style.css"><link rel="shortcut icon" href="/favicon.png"><link rel="apple-touch-icon" href="/touch.png">'
  document.body.innerHTML =
    '<a href="/private">Private content</a><link rel="icon" href="/body.png">'
  const before = document.documentElement.outerHTML
  const result = vm.runInNewContext(source, {
    document,
    location: { href: 'https://example.com/current' },
  })
  expect(result).toEqual({
    url: 'https://example.com/current',
    icons: ['http://localhost/favicon.png', 'http://localhost/touch.png'],
  })
  expect(document.documentElement.outerHTML).toBe(before)
})

it('bounds metadata returned from pages with many icon links', () => {
  document.head.innerHTML = Array.from(
    { length: 30 },
    (_, i) => `<link rel="icon" href="/${i}.png">`,
  ).join('')
  const result = vm.runInNewContext(source, {
    document,
    location: { href: 'https://example.com/' },
  })
  expect(result.icons).toHaveLength(8)
  expect(result.icons).not.toContain('http://localhost/29.png')
})
