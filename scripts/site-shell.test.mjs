import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { URL, URLSearchParams } from 'node:url'

const source = fs.readFileSync(
  new URL('../docs/assets/site-shell.js', import.meta.url),
  'utf8',
)
function createSite({
  url = 'https://tab.jenny.media/',
  saved = null,
  device = 'en-US',
  blocked = false,
} = {}) {
  const data = new Map(saved === null ? [] : [['site-language', saved]])
  const events = new Map()
  const attributes = {}
  const links = []
  const localStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  }
  const document = {
    documentElement: {
      setAttribute: (key, value) => {
        attributes[key] = value
      },
    },
    readyState: 'loading',
    querySelector: () => null,
    querySelectorAll: (selector) => (selector === 'a[href]' ? links : []),
    getElementById: () => null,
    addEventListener() {},
    dispatchEvent() {},
  }
  const window = {
    location: new URL(url),
    history: {
      state: { retained: true },
      replaceState(state, title, next) {
        this.state = state
        window.location = new URL(next, window.location)
      },
    },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener: (key, callback) => events.set(key, callback),
  }
  Object.defineProperty(window, 'localStorage', {
    get() {
      if (blocked) throw new Error('Storage denied')
      return localStorage
    },
  })
  vm.runInNewContext(source, {
    window,
    document,
    navigator: { languages: [device] },
    URL,
    URLSearchParams,
    WeakMap,
    Set,
    CustomEvent: class {
      constructor(type, value) {
        this.type = type
        this.detail = value?.detail
      }
    },
  })
  return {
    site: window.TabManagerSite,
    window,
    data,
    events,
    attributes,
    links,
  }
}

test('a supported directory hint selects and saves the language on any site route', () => {
  for (const path of ['/', '/support/', '/privacy/', '/demo/'])
    for (const language of ['en', 'zh-Hant', 'zh-Hans']) {
      const { site, data, window } = createSite({
        url: `https://tab.jenny.media${path}?scenario=research&lang=${language}#details`,
      })
      assert.equal(site.getLanguage(), language)
      assert.equal(data.get('site-language'), language)
      assert.equal(window.location.searchParams.get('scenario'), 'research')
      assert.equal(window.location.hash, '#details')
    }
})
test('a valid saved choice wins over a hint; unsupported saved values do not', () => {
  assert.equal(
    createSite({
      saved: 'en',
      url: 'https://tab.jenny.media/?lang=zh-Hant',
    }).site.getLanguage(),
    'en',
  )
  assert.equal(
    createSite({
      saved: 'unsupported',
      url: 'https://tab.jenny.media/?lang=zh-Hant',
    }).site.getLanguage(),
    'zh-Hant',
  )
})
test('invalid hints fall back to browser language without becoming saved preferences', () => {
  for (const hint of ['zh-TW', 'fr', 'ZH-HANT', '', '<script>']) {
    const state = createSite({
      url: `https://tab.jenny.media/?lang=${encodeURIComponent(hint)}`,
      device: 'zh-TW',
    })
    assert.equal(state.site.getLanguage(), 'zh-Hant')
    assert.equal(state.data.has('site-language'), false)
  }
})
test('blocked storage accepts a hint and carries a manual choice without losing URL state', () => {
  const { site, window } = createSite({
    url: 'https://tab.jenny.media/demo/?lang=zh-Hant&scenario=research#workspace',
    blocked: true,
  })
  assert.equal(site.getLanguage(), 'zh-Hant')
  site.setLanguage('zh-Hans')
  assert.equal(site.getLanguage(), 'zh-Hans')
  assert.equal(window.location.searchParams.get('lang'), 'zh-Hans')
  assert.equal(window.location.searchParams.get('scenario'), 'research')
  assert.equal(window.location.hash, '#workspace')
  assert.equal(window.history.state.retained, true)
})
test('internal links retain their own query and fragment while receiving the chosen language', () => {
  const { site, links } = createSite({
    blocked: true,
    url: 'https://tab.jenny.media/?lang=zh-Hant',
  })
  const link = (href) => ({
    href,
    getAttribute() {
      return this.href
    },
    setAttribute(key, value) {
      this.href = value
    },
  })
  links.push(
    link('/demo/?scenario=research#workspace'),
    link('#install'),
    link('https://example.com/'),
    link('/assets/example.html'),
  )
  site.setLanguage('zh-Hans')
  assert.equal(links[0].href, '/demo/?scenario=research&lang=zh-Hans#workspace')
  assert.equal(links[1].href, '#install')
  assert.equal(links[2].href, 'https://example.com/')
  assert.equal(links[3].href, '/assets/example.html')
})
test('Back/Forward restores the latest saved selection instead of stale cached language', () => {
  const { site, data, events, attributes } = createSite({
    url: 'https://tab.jenny.media/support/?lang=zh-Hant',
  })
  data.set('site-language', 'en')
  events.get('pageshow')({ persisted: true })
  assert.equal(site.getLanguage(), 'en')
  assert.equal(attributes['data-language'], 'en')
  assert.equal(data.get('site-language'), 'en')
})
