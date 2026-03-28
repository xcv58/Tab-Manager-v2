import { browser, getLastFocusedWindowId, isSelfPopup } from 'libs'
import {
  DEFAULT_ACTION_TAB_COUNT_MODE,
  normalizeActionTabCountMode,
  type ActionTabCountMode,
} from 'libs/actionTabCount'

type CanvasSurface = HTMLCanvasElement | OffscreenCanvas
type CanvasContext =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D

const ICON_SIZES = [16, 19, 32, 38]
const MAX_ICON_IMAGE_DATA_CACHE_ENTRIES = 128
const COMPACT_COUNT_SUFFIX_PATTERN = /[km]$/i
const iconImageDataCache = new Map<string, ImageData>()
const iconBitmapCache = new Map<string, Promise<CanvasImageSource>>()

const getBaseIconPath = (darkTheme: boolean) =>
  `icon-128${darkTheme ? '-dark' : ''}.png`

export const formatActionTabCountLabel = (count: number) => {
  const safeCount = Math.max(0, count)
  if (safeCount >= 1_000_000) {
    return `${Math.floor(safeCount / 1_000_000)}m`
  }
  if (safeCount >= 1_000) {
    return `${Math.floor(safeCount / 1_000)}k`
  }
  return String(safeCount)
}

const getActionTabCountTitle = (
  count: number,
  mode: Exclude<ActionTabCountMode, 'off'>,
) => {
  const tabLabel = count === 1 ? 'tab' : 'tabs'
  const modeLabel =
    mode === 'currentWindow' ? 'in this window' : 'across windows'
  return `Tab Manager v2: ${count} ${tabLabel} ${modeLabel}`
}

export const getActionCountLayout = (size: number, label: string) => {
  const overlayInsetRight = size >= 32 ? 1 : 0
  const overlayBottomInset = size <= 19 ? 1 : 0
  const isCompactLabel = COMPACT_COUNT_SUFFIX_PATTERN.test(label)

  if (/^\d$/.test(label)) {
    return {
      overlayInsetLeft: Math.max(7, Math.round(size * 0.42)),
      overlayInsetRight,
      overlayBottomInset,
      overlayHeight: Math.max(10, Math.round(size * 0.62)),
      borderRadius: Math.max(3, Math.round(size * 0.22)),
      fontSize: Math.round(size * 0.68),
      fontWeight: 900,
      textScaleX: 1,
    }
  }

  if (/^\d{2}$/.test(label)) {
    return {
      overlayInsetLeft: Math.max(5, Math.round(size * 0.29)),
      overlayInsetRight,
      overlayBottomInset,
      overlayHeight: Math.max(10, Math.round(size * 0.62)),
      borderRadius: Math.max(3, Math.round(size * 0.22)),
      fontSize: Math.round(size * 0.62),
      fontWeight: 900,
      textScaleX: 1,
    }
  }

  if (isCompactLabel) {
    return {
      overlayInsetLeft:
        label.length <= 2
          ? Math.max(4, Math.round(size * 0.24))
          : Math.max(1, Math.round(size * 0.08)),
      overlayInsetRight,
      overlayBottomInset,
      overlayHeight: Math.max(9, Math.round(size * 0.56)),
      borderRadius: Math.max(3, Math.round(size * 0.2)),
      fontSize:
        label.length <= 2
          ? Math.round(size * 0.56)
          : label.length === 3
            ? Math.round(size * 0.5)
            : Math.round(size * 0.44),
      fontWeight: label.length <= 2 ? 900 : 850,
      textScaleX: label.length <= 2 ? 1 : label.length === 3 ? 0.94 : 0.88,
    }
  }

  return {
    overlayInsetLeft: Math.max(2, Math.round(size * 0.12)),
    overlayInsetRight,
    overlayBottomInset,
    overlayHeight: Math.max(9, Math.round(size * 0.56)),
    borderRadius: Math.max(3, Math.round(size * 0.18)),
    fontSize: Math.round(size * 0.48),
    fontWeight: 850,
    textScaleX: 1,
  }
}

const createCanvas = (size: number): CanvasSurface => {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(size, size)
  }
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  return canvas
}

const getCanvasContext = (canvas: CanvasSurface): CanvasContext => {
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('2d canvas context unavailable')
  }
  return context
}

const drawRoundedRect = (
  context: CanvasContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height,
  )
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}

const loadIconBitmap = async (iconPath: string) => {
  const cachedBitmap = iconBitmapCache.get(iconPath)
  if (cachedBitmap) {
    return cachedBitmap
  }

  const iconUrl = browser.runtime.getURL(iconPath)
  const bitmapPromise = (async () => {
    const response = await fetch(iconUrl)
    const blob = await response.blob()
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(blob)
    }

    if (typeof Image !== 'undefined') {
      const image = new Image()
      image.src = iconUrl
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
      })
      return image
    }

    throw new Error('Unable to create icon bitmap')
  })()

  iconBitmapCache.set(iconPath, bitmapPromise)
  void bitmapPromise.catch(() => {
    if (iconBitmapCache.get(iconPath) === bitmapPromise) {
      iconBitmapCache.delete(iconPath)
    }
  })
  return bitmapPromise
}

const renderCountOverlay = (
  context: CanvasContext,
  size: number,
  label: string,
  darkTheme: boolean,
) => {
  const {
    overlayInsetLeft,
    overlayInsetRight,
    overlayBottomInset,
    overlayHeight,
    borderRadius,
    fontSize,
    fontWeight,
    textScaleX,
  } = getActionCountLayout(size, label)
  const overlayY = size - overlayBottomInset - overlayHeight
  const overlayX = overlayInsetLeft
  const overlayWidth = size - overlayInsetLeft - overlayInsetRight
  const foregroundColor = darkTheme ? '#1f2350' : '#ffffff'
  context.fillStyle = darkTheme
    ? 'rgba(224, 231, 255, 0.98)'
    : 'rgba(29, 78, 216, 0.98)'
  drawRoundedRect(
    context,
    overlayX,
    overlayY,
    overlayWidth,
    overlayHeight,
    borderRadius,
  )
  context.fill()
  context.strokeStyle = darkTheme
    ? 'rgba(49, 46, 129, 0.34)'
    : 'rgba(255, 255, 255, 0.32)'
  context.lineWidth = 1
  context.stroke()

  context.save()
  context.fillStyle = foregroundColor
  context.font = `${fontWeight} ${fontSize}px sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.translate(
    overlayX + overlayWidth / 2,
    overlayY + overlayHeight / 2 + 0.5,
  )
  context.scale(textScaleX, 1)
  context.fillText(label, 0, 0)
  context.restore()
}

const getCachedIconImageData = (cacheKey: string) => {
  const cachedImageData = iconImageDataCache.get(cacheKey)
  if (!cachedImageData) {
    return null
  }

  iconImageDataCache.delete(cacheKey)
  iconImageDataCache.set(cacheKey, cachedImageData)
  return cachedImageData
}

const cacheIconImageData = (cacheKey: string, imageData: ImageData) => {
  iconImageDataCache.set(cacheKey, imageData)

  while (iconImageDataCache.size > MAX_ICON_IMAGE_DATA_CACHE_ENTRIES) {
    const oldestCacheKey = iconImageDataCache.keys().next().value
    if (!oldestCacheKey) {
      break
    }
    iconImageDataCache.delete(oldestCacheKey)
  }

  return imageData
}

const getIconImageData = async (
  iconPath: string,
  label: string,
  size: number,
  darkTheme: boolean,
) => {
  const cacheKey = `${iconPath}:${darkTheme ? 'dark' : 'light'}:${label}:${size}`
  const cachedImageData = getCachedIconImageData(cacheKey)
  if (cachedImageData) {
    return cachedImageData
  }

  const canvas = createCanvas(size)
  const context = getCanvasContext(canvas)
  const bitmap = await loadIconBitmap(iconPath)
  context.clearRect(0, 0, size, size)
  context.drawImage(bitmap, 0, 0, size, size)
  renderCountOverlay(context, size, label, darkTheme)
  const imageData = context.getImageData(0, 0, size, size)
  return cacheIconImageData(cacheKey, imageData)
}

const getIconImageDataSet = async (
  iconPath: string,
  label: string,
  darkTheme: boolean,
) => {
  const entries = await Promise.all(
    ICON_SIZES.map(async (size) => [
      size,
      await getIconImageData(iconPath, label, size, darkTheme),
    ]),
  )
  return Object.fromEntries(entries)
}

const getCurrentWindowTabCount = async () => {
  const fallbackToLastFocusedWindow = async () => {
    if (!browser.windows.getLastFocused) {
      return 0
    }
    const win = await browser.windows.getLastFocused({ populate: true })
    if (!win || isSelfPopup(win)) {
      return 0
    }
    return (win.tabs || []).length
  }

  const lastFocusedWindowId = await getLastFocusedWindowId()
  if (lastFocusedWindowId == null) {
    return fallbackToLastFocusedWindow()
  }

  try {
    const win = await browser.windows.get(lastFocusedWindowId, {
      populate: true,
    })
    if (!win || isSelfPopup(win)) {
      return fallbackToLastFocusedWindow()
    }
    return (win.tabs || []).length
  } catch {
    return fallbackToLastFocusedWindow()
  }
}

export function getActionTabCount(mode: 'off'): Promise<null>
export function getActionTabCount(
  mode: Exclude<ActionTabCountMode, 'off'>,
): Promise<number>
export async function getActionTabCount(mode: ActionTabCountMode) {
  if (mode === 'off') {
    return null
  }

  if (mode === 'currentWindow') {
    return getCurrentWindowTabCount()
  }

  const windows = await browser.windows.getAll({ populate: true })
  return windows.reduce((count, win) => {
    if (isSelfPopup(win)) {
      return count
    }
    return count + (win.tabs || []).length
  }, 0)
}

export const readActionIconSettings = async () => {
  // `systemTheme` is runtime state written by App into local storage, while the
  // persisted user setting prefers sync storage with a local fallback.
  const { systemTheme } = await browser.storage.local.get('systemTheme')

  try {
    const { actionTabCountMode } =
      await browser.storage.sync.get('actionTabCountMode')
    return {
      actionTabCountMode: normalizeActionTabCountMode(
        actionTabCountMode ?? DEFAULT_ACTION_TAB_COUNT_MODE,
      ),
      systemTheme,
    }
  } catch {
    const { actionTabCountMode } =
      await browser.storage.local.get('actionTabCountMode')
    return {
      actionTabCountMode: normalizeActionTabCountMode(
        actionTabCountMode ?? DEFAULT_ACTION_TAB_COUNT_MODE,
      ),
      systemTheme,
    }
  }
}

export const setBrowserIcon = async () => {
  const { actionTabCountMode, systemTheme } = await readActionIconSettings()
  const darkTheme = systemTheme === 'dark'
  const iconPath = getBaseIconPath(darkTheme)

  if (actionTabCountMode === 'off') {
    ;[browser.browserAction, browser.action].forEach((action) => {
      if (action && action.setIcon) {
        action.setIcon({ path: iconPath })
        action.setTitle?.({ title: 'Tab Manager v2' })
      }
    })
    return
  }

  const tabCount = await getActionTabCount(actionTabCountMode)
  const imageData = await getIconImageDataSet(
    iconPath,
    formatActionTabCountLabel(tabCount),
    darkTheme,
  )
  ;[browser.browserAction, browser.action].forEach((action) => {
    if (action && action.setIcon) {
      action.setIcon({ imageData })
      action.setTitle?.({
        title: getActionTabCountTitle(tabCount, actionTabCountMode),
      })
    }
  })
}
