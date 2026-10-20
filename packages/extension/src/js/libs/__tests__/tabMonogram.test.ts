import { createTabMonogram, websiteOriginPattern } from '../tabMonogram'

it.each([
  'file:///private',
  'safari-web-extension://manager/popup.html',
  'chrome://newtab',
  'javascript:alert(1)',
  'data:text/plain,private',
  'https://user:password@example.com/',
  'invalid',
])(
  'never requests website access or generates a website icon for %s',
  (url) => {
    expect(websiteOriginPattern(url)).toBeNull()
    expect(createTabMonogram(url)).toBeNull()
  },
)
it('does not include paths, queries, or unsupported port restrictions in permission requests', () => {
  expect(
    websiteOriginPattern('https://example.com:8443/private?q=secret#anchor'),
  ).toBe('https://example.com/*')
})
it('generates a stable local icon for a website without embedding its path or title', () => {
  expect(
    createTabMonogram(
      'https://www.example.com/private?secret=1',
      'Private title',
    ),
  ).toBe(createTabMonogram('https://www.example.com/another', 'Other title'))
  const svg = decodeURIComponent(
    createTabMonogram('https://www.example.com/private?secret=1')!.split(
      ',',
    )[1],
  )
  expect(svg).toContain('>E</text>')
  expect(svg).not.toMatch(/private|secret|example\.com|href=/)
})
it('uses sample-page initials for local hosts and escapes markup', () => {
  const svg = decodeURIComponent(
    createTabMonogram('http://127.0.0.1:8831/notes', '<script>')!.split(',')[1],
  )
  expect(svg).toContain('&lt;</text>')
  expect(svg).not.toContain('<script>')
  expect(createTabMonogram('http://127.0.0.1:8831/notes', 'Notes')).not.toBe(
    createTabMonogram('http://127.0.0.1:8831/projects', 'Projects'),
  )
})
