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
      'Release reports': '发布报告',
      Install: '安装',
      Privacy: '隐私',
      Support: '支持',
      Language: '语言',
      'Choose language': '选择语言',
      'Main navigation': '主导航',
      'Open menu': '打开菜单',
      'Close menu': '关闭菜单',
      'Tab Manager v2 logo': 'Tab Manager v2 标志',
    },
    'zh-Hant': {
      Overview: '總覽',
      'Try demo': '試用示範',
      'Release reports': '發佈報告',
      Install: '安裝',
      Privacy: '隱私',
      Support: '支援',
      Language: '語言',
      'Choose language': '選擇語言',
      'Main navigation': '主導覽',
      'Open menu': '開啟選單',
      'Close menu': '關閉選單',
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

  function getLanguageHint() {
    const hint = new URLSearchParams(window.location.search).get('lang')
    return languages.has(hint) ? hint : null
  }

  function getPreferredLanguage() {
    const saved = readPreference('site-language')
    return languages.has(saved)
      ? saved
      : getLanguageHint() || getDeviceLanguage()
  }

  // Carry the current choice between site pages even if storage is blocked.
  // Existing route parameters and section anchors stay intact.
  function languageLink(link) {
    const href = link.getAttribute('href')
    if (!href || href.startsWith('#')) return
    const url = new URL(href, window.location.href)
    if (url.origin !== window.location.origin) return
    if (!/\/$|\.html$/.test(url.pathname)) return
    if (/\/(assets|site)\//.test(url.pathname)) return
    url.searchParams.set('lang', language)
    const next = url.pathname + url.search + url.hash
    if (href !== next) link.setAttribute('href', next)
  }

  function updateLanguageLinks() {
    document.querySelectorAll('a[href]').forEach(languageLink)
  }

  let darkMedia = null
  try {
    darkMedia = window.matchMedia('(prefers-color-scheme: dark)')
  } catch {
    // Browsers without media-query support use the light system appearance.
  }
  let theme = normalizeTheme(readPreference('theme'))
  let language = getPreferredLanguage()
  if (!languages.has(readPreference('site-language')) && getLanguageHint()) {
    writePreference('site-language', language)
  }
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
    updateLanguageLinks()
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
    const menuToggle = document.getElementById('site-menu-toggle')
    if (menuToggle) {
      const label =
        menuToggle.getAttribute('aria-expanded') === 'true'
          ? text('Close menu', '关闭菜单', '關閉選單')
          : text('Open menu', '打开菜单', '開啟選單')
      menuToggle.setAttribute('aria-label', label)
      menuToggle.title = label
    }
    const toggle = document.getElementById('theme-toggle')
    if (toggle) {
      toggle.hidden = false
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
    if (persist) {
      writePreference('site-language', language)
      const url = new URL(window.location.href)
      url.searchParams.set('lang', language)
      window.history.replaceState(window.history.state, '', url)
    }
    updateControls()
    if (announce) announceLanguage()
    if (changed) dispatchLanguage()
    else updateLanguageLinks()
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

  function initializeHeaderMenu({ header, control, panel, breakpoint, label }) {
    if (!header || !control || !panel) return
    const phone = window.matchMedia(`(max-width: ${breakpoint}px)`)
    let lastHeaderFocus = null
    let compact = false
    let initialized = false
    const desktopFits = () => {
      const logo = header.querySelector('.logo')
      const appearance = header.querySelector('.theme-toggle')
      if (!logo || !appearance) return true
      header.setAttribute('data-menu-measuring', '')
      const needed =
        logo.getBoundingClientRect().width +
        panel.getBoundingClientRect().width +
        appearance.getBoundingClientRect().width +
        32 // Two 16px gaps in the full desktop row.
      const available = header.getBoundingClientRect().width
      header.removeAttribute('data-menu-measuring')
      return needed <= available
    }
    const isOpen = () => compact && !panel.hidden
    const setOpen = (open) => {
      panel.hidden = compact && !open
      control.setAttribute('aria-expanded', String(compact && open))
      control.setAttribute('aria-label', label(compact && open))
      control.title = control.getAttribute('aria-label')
      if (!open)
        panel.querySelectorAll('details[open]').forEach((details) => {
          details.open = false
        })
    }
    const close = (returnFocus = false) => {
      const wasOpen = isOpen()
      setOpen(false)
      if (wasOpen && returnFocus) control.focus({ preventScroll: true })
    }
    const sync = (reset = false) => {
      const nextCompact = phone.matches || !desktopFits()
      if (initialized && nextCompact === compact && !reset) return
      // CSS may hide the focused link before the media-query event reaches us.
      const active =
        document.activeElement === document.body
          ? lastHeaderFocus
          : document.activeElement
      const panelFocused = !!active && panel.contains(active)
      const menuFocused = active === control
      compact = nextCompact
      initialized = true
      header.toggleAttribute('data-menu-compact', compact)
      control.hidden = !compact
      setOpen(false)
      // Match the visible reading order while retaining one set of native links.
      if (compact) {
        if (header.lastElementChild !== panel) header.append(panel)
      } else if (panel.nextElementSibling !== control)
        header.insertBefore(panel, control)
      if (compact && panelFocused) control.focus({ preventScroll: true })
      else if (!compact && (panelFocused || menuFocused)) {
        const destination = panelFocused
          ? active
          : panel.querySelector('a, summary, select, button')
        destination?.focus({ preventScroll: true })
      }
    }
    header.addEventListener('focusin', (event) => {
      lastHeaderFocus = event.target
    })
    document.addEventListener('focusin', (event) => {
      if (!header.contains(event.target)) {
        lastHeaderFocus = null
        close()
      }
    })
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (!header.contains(event.target)) {
          lastHeaderFocus = null
          close()
        }
      },
      true,
    )
    control.addEventListener('click', () => setOpen(!isOpen()))
    document.addEventListener('click', (event) => {
      if (!header.contains(event.target)) close()
    })
    header.addEventListener('focusout', (event) => {
      if (event.relatedTarget && !header.contains(event.relatedTarget)) close()
    })
    window.addEventListener('blur', () => {
      // Focus entering the embedded demo does not dispatch parent focusin.
      if (document.activeElement instanceof HTMLIFrameElement) {
        lastHeaderFocus = null
        close()
      }
    })
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Escape' || !isOpen()) return
        // Let the existing language disclosure handle its own first Escape.
        if (event.target.closest?.('details[open]')) return
        event.preventDefault()
        close(true)
      },
      true,
    )
    panel.addEventListener('click', (event) => {
      const link = event.target.closest('a')
      if (
        !link ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button
      )
        return
      close()
      const target = new URL(link.href)
      if (
        target.origin === location.origin &&
        target.pathname === location.pathname &&
        target.search === location.search &&
        target.hash
      ) {
        const destination = document.getElementById(
          decodeURIComponent(target.hash.slice(1)),
        )
        if (destination) {
          destination.tabIndex = -1
          destination.focus({ preventScroll: true })
        }
      }
    })
    let pendingSync = null
    const scheduleSync = () => {
      if (pendingSync !== null) return
      pendingSync = window.requestAnimationFrame(() => {
        pendingSync = null
        sync()
      })
    }
    phone.addEventListener('change', scheduleSync)
    window.addEventListener('resize', scheduleSync)
    document.addEventListener('site:language-change', scheduleSync)
    document.fonts?.ready.then(scheduleSync)
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(scheduleSync)
      ;[
        header,
        ...header.querySelectorAll('.logo, .nav-links, select'),
      ].forEach((element) => observer.observe(element))
    }
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) sync(true)
    })
    header.setAttribute('data-header-ready', '')
    sync()
  }

  function ready() {
    const header = document.querySelector('.site-header')
    const menuToggle = document.getElementById('site-menu-toggle')
    const navigation = document.getElementById('site-navigation')
    if (header && menuToggle && navigation) {
      initializeHeaderMenu({
        header,
        control: menuToggle,
        panel: navigation,
        breakpoint: 1050,
        label: (open) =>
          open
            ? text('Close menu', '关闭菜单', '關閉選單')
            : text('Open menu', '打开菜单', '開啟選單'),
      })
      header.setAttribute('data-menu-ready', '')
    }
    updateControls()
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      setTheme(resolveTheme() === 'dark' ? 'light' : 'dark')
    })
    document.querySelectorAll('[data-site-appearance]').forEach((button) => {
      button.addEventListener('click', () => setTheme('system'))
    })
    const selector = document.getElementById('language-selector')
    selector?.addEventListener('change', () => setLanguage(selector.value))
    document.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return
      const link = event.target.closest('a[href]')
      if (link) languageLink(link)
    })
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
          ? getLanguageHint() || getDeviceLanguage()
          : event.newValue,
        { persist: false, announce: false },
      )
    }
  })
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      setLanguage(getPreferredLanguage(), { persist: false, announce: false })
    }
  })
})()
