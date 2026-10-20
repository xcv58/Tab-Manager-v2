import { websiteOriginPattern } from '../websiteOriginPattern'

it.each([
  'file:///private',
  'safari-web-extension://manager/popup.html',
  'chrome://newtab',
  'javascript:alert(1)',
  'data:text/plain,private',
  'https://user:password@example.com/',
  'invalid',
])('never requests website access for %s', (url) => {
  expect(websiteOriginPattern(url)).toBeNull()
})
it('does not include paths, queries, or unsupported port restrictions in permission requests', () => {
  expect(
    websiteOriginPattern('https://example.com:8443/private?q=secret#anchor'),
  ).toBe('https://example.com/*')
})
