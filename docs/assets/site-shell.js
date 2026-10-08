;(function () {
  const html = document.documentElement
  const themes = new Set(['system', 'light', 'dark'])
  const languages = new Set(['en', 'zh-Hans', 'zh-Hant'])
  const originalHeaderText = new WeakMap()
  const originalHeaderAttributes = new WeakMap()
  const headerCopy = {
    'zh-Hans': {
      Overview: '总览',
      'Try demo': '试用演示',
      Install: '安装',
      Privacy: '隐私',
      Support: '支持',
      Language: '语言',
      'Choose language': '选择语言',
      'Main navigation': '主导航',
      'Tab Manager v2 logo': 'Tab Manager v2 标志',
    },
    'zh-Hant': {
      Overview: '總覽',
      'Try demo': '試用示範',
      Install: '安裝',
      Privacy: '隱私',
      Support: '支援',
      Language: '語言',
      'Choose language': '選擇語言',
      'Main navigation': '主導覽',
      'Tab Manager v2 logo': 'Tab Manager v2 標誌',
    },
  }

  function normalizeTheme(value) {
    return themes.has(value) ? value : 'system'
  }

  function normalizeLanguage(value) {
    if (languages.has(value)) return value
    const normalized = String(value || '').toLowerCase()
    if (normalized.includes('hant') || /^zh-(tw|hk|mo)(-|$)/.test(normalized)) {
      return 'zh-Hant'
    }
    return normalized.startsWith('zh') ? 'zh-Hans' : 'en'
  }

  function getDeviceLanguage() {
    const preferred = Array.isArray(navigator.languages)
      ? navigator.languages
      : [navigator.language]
    for (const value of preferred) {
      if (/^(zh|en)(-|$)/i.test(String(value || ''))) {
        return normalizeLanguage(value)
      }
    }
    return 'en'
  }

  function readPreference(key) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  }

  function writePreference(key, value) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Keep the page's current selection when browser storage is unavailable.
    }
  }

  let darkMedia = null
  try {
    darkMedia = window.matchMedia('(prefers-color-scheme: dark)')
  } catch {
    // Browsers without media-query support use the light system appearance.
  }
  let theme = normalizeTheme(readPreference('theme'))
  const storedLanguage = readPreference('site-language')
  let language = storedLanguage
    ? normalizeLanguage(storedLanguage)
    : getDeviceLanguage()
  let resolvedTheme = resolveTheme()

  function resolveTheme() {
    return theme === 'system' ? (darkMedia?.matches ? 'dark' : 'light') : theme
  }

  function text(english, hans, hant) {
    if (language === 'zh-Hans') return hans || english
    if (language === 'zh-Hant') return hant || english
    return english
  }

  function applyPreferences() {
    html.setAttribute('data-theme', theme)
    html.setAttribute('data-language', language)
    html.lang = language
  }

  function dispatchTheme(selection = false) {
    document.dispatchEvent(
      new CustomEvent('site:theme-change', {
        detail: { theme, resolvedTheme, selection },
      }),
    )
  }

  function dispatchLanguage() {
    document.dispatchEvent(
      new CustomEvent('site:language-change', { detail: { language } }),
    )
  }

  function localizeHeader() {
    const header = document.querySelector('.site-header')
    if (!header) return
    const walker = document.createTreeWalker(header, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement?.closest('svg, script, style, option') ||
          !node.nodeValue.trim()
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT
      },
    })
    while (walker.nextNode()) {
      const node = walker.currentNode
      if (!originalHeaderText.has(node)) {
        originalHeaderText.set(node, node.nodeValue)
      }
      const original = originalHeaderText.get(node)
      const key = original.replace(/\s+/g, ' ').trim()
      const translated = headerCopy[language]?.[key]
      node.nodeValue = translated
        ? `${original.match(/^\s*/)[0]}${translated}${original.match(/\s*$/)[0]}`
        : original
    }
    header
      .querySelectorAll('[aria-label], [title], [alt]')
      .forEach((element) => {
        if (!originalHeaderAttributes.has(element)) {
          originalHeaderAttributes.set(element, {})
        }
        const originals = originalHeaderAttributes.get(element)
        ;['aria-label', 'title', 'alt'].forEach((attribute) => {
          if (!element.hasAttribute(attribute)) return
          if (!Object.prototype.hasOwnProperty.call(originals, attribute)) {
            originals[attribute] = element.getAttribute(attribute)
          }
          const original = originals[attribute]
          element.setAttribute(
            attribute,
            headerCopy[language]?.[original] || original,
          )
        })
      })
  }

  function updateControls() {
    const selector = document.getElementById('language-selector')
    if (selector) selector.value = language
    localizeHeader()
    const toggle = document.getElementById('theme-toggle')
    if (toggle) {
      const nextAppearance = resolvedTheme === 'dark' ? 'light' : 'dark'
      const label =
        nextAppearance === 'dark'
          ? text(
              'Switch to dark appearance',
              '切换为深色外观',
              '切換為深色外觀',
            )
          : text(
              'Switch to light appearance',
              '切换为浅色外观',
              '切換為淺色外觀',
            )
      toggle.setAttribute('aria-label', label)
      toggle.title = label
      toggle.querySelectorAll('[data-theme-icon]').forEach((icon) => {
        icon.toggleAttribute(
          'hidden',
          icon.dataset.themeIcon !== nextAppearance,
        )
      })
    }
    document.querySelectorAll('[data-site-appearance]').forEach((button) => {
      button.textContent = text(
        'Use system appearance',
        '使用系统外观',
        '使用系統外觀',
      )
      button.setAttribute('aria-pressed', String(theme === 'system'))
    })
  }

  function announceTheme() {
    const announcement = document.getElementById('theme-announcement')
    if (!announcement) return
    const messages = {
      system: text(
        'System theme selected',
        '已选择跟随系统主题',
        '已選擇跟隨系統主題',
      ),
      light: text('Light theme selected', '已选择浅色主题', '已選擇淺色主題'),
      dark: text('Dark theme selected', '已选择深色主题', '已選擇深色主題'),
    }
    announcement.textContent = messages[theme]
  }

  function announceLanguage() {
    const announcement = document.getElementById('language-announcement')
    if (announcement) {
      announcement.textContent = text(
        'English selected',
        '已切换为简体中文',
        '已切換為繁體中文',
      )
    }
  }

  function setTheme(value, { persist = true, announce = true } = {}) {
    const nextTheme = normalizeTheme(value)
    const previousTheme = theme
    const previousResolvedTheme = resolvedTheme
    theme = nextTheme
    resolvedTheme = resolveTheme()
    applyPreferences()
    if (persist) writePreference('theme', theme)
    updateControls()
    if (announce) announceTheme()
    if (
      announce ||
      theme !== previousTheme ||
      resolvedTheme !== previousResolvedTheme
    ) {
      dispatchTheme(announce)
    }
  }

  function setLanguage(value, { persist = true, announce = true } = {}) {
    const nextLanguage = normalizeLanguage(value)
    const changed = language !== nextLanguage
    language = nextLanguage
    applyPreferences()
    if (persist) writePreference('site-language', language)
    updateControls()
    if (announce) announceLanguage()
    if (changed) dispatchLanguage()
  }

  window.TabManagerSite = {
    getTheme: () => theme,
    getResolvedTheme: () => resolvedTheme,
    getLanguage: () => language,
    setTheme,
    setLanguage,
    text,
  }
  applyPreferences()

  function ready() {
    updateControls()
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      setTheme(resolveTheme() === 'dark' ? 'light' : 'dark')
    })
    document.querySelectorAll('[data-site-appearance]').forEach((button) => {
      button.addEventListener('click', () => setTheme('system'))
    })
    const selector = document.getElementById('language-selector')
    selector?.addEventListener('change', () => setLanguage(selector.value))
    dispatchLanguage()
    dispatchTheme()
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true })
  } else {
    ready()
  }

  const systemThemeChanged = () => {
    if (theme === 'system')
      setTheme('system', { persist: false, announce: false })
  }
  if (typeof darkMedia?.addEventListener === 'function') {
    darkMedia.addEventListener('change', systemThemeChanged)
  } else if (typeof darkMedia?.addListener === 'function') {
    darkMedia.addListener(systemThemeChanged)
  }
  window.addEventListener('storage', (event) => {
    try {
      if (event.storageArea !== window.localStorage) return
    } catch {
      return
    }
    if (event.key === 'theme' || event.key === null) {
      setTheme(event.key === null ? null : event.newValue, {
        persist: false,
        announce: false,
      })
    }
    if (event.key === 'site-language' || event.key === null) {
      setLanguage(
        event.key === null || !event.newValue
          ? getDeviceLanguage()
          : event.newValue,
        { persist: false, announce: false },
      )
    }
  })
})()
