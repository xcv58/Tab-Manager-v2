document.addEventListener('DOMContentLoaded', () => {
  const html = document.documentElement
  const body = document.body
  const prefersDarkMedia = window.matchMedia('(prefers-color-scheme: dark)')
  const themeAnnouncement = document.getElementById('theme-announcement')
  const themeButtons = {
    system: document.getElementById('btn-system'),
    light: document.getElementById('btn-light'),
    dark: document.getElementById('btn-dark'),
  }
  const screenshotThemeButtons = {
    light: document.getElementById('screenshot-btn-light'),
    dark: document.getElementById('screenshot-btn-dark'),
  }
  const screenshotThemeAnnouncement = document.getElementById(
    'screenshot-theme-announcement',
  )
  const screenshotVariantFrames = Array.from(
    document.querySelectorAll('.screenshot-variant'),
  )
  const promoVideo = document.querySelector('.promo-video')
  const videoTourLayout = document.querySelector('.video-tour-layout')
  const videoTourFrame = document.querySelector('.video-tour-frame')
  const videoTourCopy = document.querySelector('.video-tour-copy')
  const videoChapterButtons = Array.from(
    document.querySelectorAll('.video-tour-chapter'),
  )
  const supportedThemes = new Set(Object.keys(themeButtons))
  let lightbox = null
  let selectedScreenshotTheme = null
  let promoVideoPlayer = null
  let promoVideoPrimed = false

  function normalizeTheme(theme) {
    return supportedThemes.has(theme) ? theme : 'system'
  }

  function getStoredTheme() {
    try {
      return normalizeTheme(localStorage.getItem('theme'))
    } catch {
      return 'system'
    }
  }

  function getResolvedTheme(
    theme = html.getAttribute('data-theme') || 'system',
  ) {
    const normalizedTheme = normalizeTheme(theme)
    if (normalizedTheme === 'light' || normalizedTheme === 'dark') {
      return normalizedTheme
    }
    return prefersDarkMedia.matches ? 'dark' : 'light'
  }

  function announceTheme(theme) {
    if (!themeAnnouncement) {
      return
    }
    const label =
      theme === 'system'
        ? 'System theme selected'
        : `${theme.charAt(0).toUpperCase()}${theme.slice(1)} theme selected`
    themeAnnouncement.textContent = label
  }

  function announceScreenshotTheme(theme) {
    if (!screenshotThemeAnnouncement) {
      return
    }
    screenshotThemeAnnouncement.textContent = `${theme.charAt(0).toUpperCase()}${theme.slice(1)} screenshots selected`
  }

  function updateControls(activeTheme) {
    Object.entries(themeButtons).forEach(([theme, button]) => {
      if (!button) {
        return
      }
      const isActive = theme === activeTheme
      button.classList.toggle('active', isActive)
      button.setAttribute('aria-pressed', String(isActive))
    })
  }

  function updateScreenshotControls(activeTheme) {
    Object.entries(screenshotThemeButtons).forEach(([theme, button]) => {
      if (!button) {
        return
      }
      const isActive = theme === activeTheme
      button.classList.toggle('active', isActive)
      button.setAttribute('aria-pressed', String(isActive))
    })
  }

  function applyScreenshotTheme(theme, options = {}) {
    if (theme !== 'light' && theme !== 'dark') {
      return
    }

    const { announce = false } = options

    screenshotVariantFrames.forEach((frame) => {
      const image = frame.querySelector('img')
      const href = frame.dataset[`${theme}Href`]
      const src = frame.dataset[`${theme}Src`]
      const srcset = frame.dataset[`${theme}Srcset`]
      const title = frame.dataset[`${theme}Title`]
      const alt = frame.dataset[`${theme}Alt`]

      frame.setAttribute('data-screenshot-theme', theme)

      if (href) {
        frame.setAttribute('href', href)
      }
      if (title) {
        frame.setAttribute('data-title', title)
      }
      if (image && src) {
        image.setAttribute('src', src)
      }
      if (image && srcset) {
        image.setAttribute('srcset', srcset)
      }
      if (image && alt) {
        image.setAttribute('alt', alt)
      }
    })

    updateScreenshotControls(theme)

    if (announce) {
      announceScreenshotTheme(theme)
    }

    document.dispatchEvent(new CustomEvent('screenshots-theme-updated'))
  }

  function getActiveScreenshotTheme() {
    return selectedScreenshotTheme || getResolvedTheme()
  }

  function syncScreenshotThemeWithPage(options = {}) {
    applyScreenshotTheme(getActiveScreenshotTheme(), options)
  }

  function selectScreenshotTheme(theme, announce = true) {
    selectedScreenshotTheme = theme
    syncScreenshotThemeWithPage({ announce })
  }

  function setTheme(theme, shouldAnnounce = true) {
    const nextTheme = normalizeTheme(theme)
    html.setAttribute('data-theme', nextTheme)
    try {
      localStorage.setItem('theme', nextTheme)
    } catch {
      // Ignore storage failures and keep the in-memory selection.
    }
    selectedScreenshotTheme = null
    updateControls(nextTheme)
    syncScreenshotThemeWithPage()
    if (shouldAnnounce) {
      announceTheme(nextTheme)
    }
  }

  Object.entries(themeButtons).forEach(([theme, button]) => {
    if (!button) {
      return
    }
    button.addEventListener('click', () => {
      setTheme(theme)
    })
  })

  Object.entries(screenshotThemeButtons).forEach(([theme, button]) => {
    if (!button) {
      return
    }

    button.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') {
        return
      }
      selectScreenshotTheme(theme)
    })

    button.addEventListener('click', (event) => {
      event.preventDefault()
      selectScreenshotTheme(theme)
    })
  })

  const handleSystemThemeChange = () => {
    if (
      normalizeTheme(html.getAttribute('data-theme')) !== 'system' ||
      selectedScreenshotTheme
    ) {
      return
    }
    syncScreenshotThemeWithPage()
  }

  if (typeof prefersDarkMedia.addEventListener === 'function') {
    prefersDarkMedia.addEventListener('change', handleSystemThemeChange)
  } else if (typeof prefersDarkMedia.addListener === 'function') {
    prefersDarkMedia.addListener(handleSystemThemeChange)
  }

  function getLightboxSkin() {
    return getResolvedTheme()
  }

  function createLightbox() {
    if (typeof window.GLightbox !== 'function') {
      return null
    }
    return window.GLightbox({
      selector: '.glightbox',
      touchNavigation: true,
      loop: true,
      autoplayVideos: false,
      skin: getLightboxSkin(),
    })
  }

  function refreshLightbox() {
    if (!lightbox) {
      lightbox = createLightbox()
      return
    }
    lightbox.destroy()
    lightbox = createLightbox()
  }

  setTheme(getStoredTheme(), false)
  refreshLightbox()

  const themeObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-theme') {
        refreshLightbox()
      }
    })
  })

  themeObserver.observe(html, { attributes: true })

  document.addEventListener('screenshots-theme-updated', () => {
    refreshLightbox()
  })

  function setActiveVideoChapter(currentTime) {
    if (!videoChapterButtons.length) {
      return
    }

    let activeIndex = 0
    videoChapterButtons.forEach((button, index) => {
      const seekTime = Number(button.dataset.videoSeek || '0')
      if (currentTime >= seekTime) {
        activeIndex = index
      }
    })

    videoChapterButtons.forEach((button, index) => {
      const isActive = index === activeIndex
      button.classList.toggle('active', isActive)
      button.setAttribute('aria-pressed', String(isActive))
    })
  }

  function syncVideoTourHeight() {
    if (!videoTourLayout || !videoTourFrame || !videoTourCopy) {
      return
    }

    const isStacked = videoTourCopy.offsetTop > videoTourFrame.offsetTop + 8
    if (isStacked) {
      videoTourLayout.style.removeProperty('--video-tour-frame-height')
      return
    }

    const frameHeight = Math.round(
      videoTourFrame.getBoundingClientRect().height,
    )
    if (frameHeight > 0) {
      videoTourLayout.style.setProperty(
        '--video-tour-frame-height',
        `${frameHeight}px`,
      )
    }
  }

  function getVideoRangeEnd(timeRanges) {
    if (!timeRanges || timeRanges.length === 0) {
      return 0
    }

    return timeRanges.end(timeRanges.length - 1)
  }

  function canSeekPromoVideoTo(nextTime) {
    if (!promoVideo || Number.isNaN(nextTime)) {
      return false
    }

    const seekableEnd = getVideoRangeEnd(promoVideo.seekable)
    const bufferedEnd = getVideoRangeEnd(promoVideo.buffered)

    return (
      seekableEnd >= nextTime - 0.1 ||
      bufferedEnd >= nextTime - 0.1 ||
      promoVideo.readyState >= 4
    )
  }

  function primePromoVideo() {
    if (!promoVideo || promoVideoPrimed) {
      return
    }

    promoVideoPrimed = true
    promoVideo.preload = 'auto'
    if (promoVideoPlayer && typeof promoVideoPlayer.load === 'function') {
      promoVideoPlayer.load()
      return
    }
    promoVideo.load()
  }

  function waitForPromoVideoSeekTarget(nextTime, timeoutMs = 6000) {
    if (!promoVideo) {
      return Promise.resolve()
    }

    if (canSeekPromoVideoTo(nextTime)) {
      return Promise.resolve()
    }

    primePromoVideo()

    return new Promise((resolve) => {
      let finished = false
      let timeoutId = null

      const cleanup = () => {
        if (timeoutId) {
          window.clearTimeout(timeoutId)
        }
        ;[
          'progress',
          'loadeddata',
          'loadedmetadata',
          'canplay',
          'canplaythrough',
          'suspend',
        ].forEach((eventName) => {
          promoVideo.removeEventListener(eventName, checkReady)
        })
      }

      const finish = () => {
        if (finished) {
          return
        }
        finished = true
        cleanup()
        resolve()
      }

      const checkReady = () => {
        if (canSeekPromoVideoTo(nextTime)) {
          finish()
        }
      }

      timeoutId = window.setTimeout(finish, timeoutMs)
      ;[
        'progress',
        'loadeddata',
        'loadedmetadata',
        'canplay',
        'canplaythrough',
        'suspend',
      ].forEach((eventName) => {
        promoVideo.addEventListener(eventName, checkReady)
      })
      checkReady()
    })
  }

  async function seekPromoVideo(nextTime) {
    if (!promoVideo || Number.isNaN(nextTime)) {
      return
    }

    const applySeek = () => {
      if (
        promoVideoPlayer &&
        typeof promoVideoPlayer.currentTime === 'function'
      ) {
        promoVideoPlayer.currentTime(nextTime)
      } else {
        promoVideo.currentTime = nextTime
      }
      setActiveVideoChapter(nextTime)
      const playPromise =
        promoVideoPlayer && typeof promoVideoPlayer.play === 'function'
          ? promoVideoPlayer.play()
          : promoVideo.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {})
      }
    }

    if (promoVideo.readyState >= 1) {
      await waitForPromoVideoSeekTarget(nextTime)
      applySeek()
      return
    }

    promoVideo.addEventListener(
      'loadedmetadata',
      async () => {
        await waitForPromoVideoSeekTarget(nextTime)
        applySeek()
      },
      { once: true },
    )
    primePromoVideo()
  }

  if (promoVideo && videoChapterButtons.length) {
    if (typeof window.videojs === 'function') {
      promoVideoPlayer = window.videojs(promoVideo, {
        fluid: true,
        preload: 'auto',
        playbackRates: [1, 1.25, 1.5, 2],
        controlBar: {
          remainingTimeDisplay: false,
          skipButtons: {
            backward: 10,
            forward: 10,
          },
          pictureInPictureToggle: false,
        },
      })
    }

    setActiveVideoChapter(0)
    syncVideoTourHeight()

    const videoTourSection = promoVideo.closest('#video-tour')
    if (videoTourSection && 'IntersectionObserver' in window) {
      const promoVideoObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return
            }
            primePromoVideo()
            observer.disconnect()
          })
        },
        {
          root: null,
          rootMargin: '240px 0px',
          threshold: 0.1,
        },
      )

      promoVideoObserver.observe(videoTourSection)
    }

    videoChapterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        void seekPromoVideo(Number(button.dataset.videoSeek || '0'))
      })
    })

    if (promoVideoPlayer) {
      promoVideoPlayer.ready(() => {
        setActiveVideoChapter(promoVideoPlayer.currentTime() || 0)
        syncVideoTourHeight()
      })
      promoVideoPlayer.on('loadedmetadata', () => {
        setActiveVideoChapter(promoVideoPlayer.currentTime() || 0)
        syncVideoTourHeight()
      })
      promoVideoPlayer.on('timeupdate', () => {
        setActiveVideoChapter(promoVideoPlayer.currentTime() || 0)
      })
    } else {
      promoVideo.addEventListener('loadedmetadata', () => {
        setActiveVideoChapter(promoVideo.currentTime)
        syncVideoTourHeight()
      })

      promoVideo.addEventListener('timeupdate', () => {
        setActiveVideoChapter(promoVideo.currentTime)
      })
    }
  }

  if (typeof window.ResizeObserver === 'function' && videoTourFrame) {
    const videoTourResizeObserver = new ResizeObserver(() => {
      syncVideoTourHeight()
    })

    videoTourResizeObserver.observe(videoTourFrame)
  }

  window.addEventListener('resize', syncVideoTourHeight)

  // Enable :active states on iOS Safari
  document.addEventListener('touchstart', () => {}, { passive: true })

  requestAnimationFrame(() => {
    body.classList.remove('preload')
  })

  const observer = new IntersectionObserver(
    (entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return
        }
        entry.target.classList.add('visible')
        instance.unobserve(entry.target)
      })
    },
    {
      root: null,
      rootMargin: '0px',
      threshold: 0.12,
    },
  )

  document.querySelectorAll('.fade-in').forEach((element) => {
    observer.observe(element)
  })

  const backToTopBtn = document.getElementById('backToTop')

  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        backToTopBtn.classList.add('visible')
      } else {
        backToTopBtn.classList.remove('visible')
      }
    })

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    })
  }
})
