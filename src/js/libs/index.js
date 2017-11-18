import { green } from 'material-ui/colors'

export const dropTargetColor = green[100]
export const popupURL = chrome.runtime.getURL('popup.html')

export const moveTabs = async (tabs, windowId, from = 0) => {
  await Promise.all(
    tabs.map(
      async ({ id, pinned }, i) => {
        const index = from + (from !== -1 ? i : 0)
        await chrome.tabs.move(id, { windowId, index })
        await chrome.tabs.update(id, { pinned })
      }
    )
  )
}

export const createWindow = async (tabs) => {
  const [ firstTab, ...restTabs ] = tabs
  const tabId = firstTab.id
  const win = await chrome.windows.create({ tabId })
  await moveTabs(restTabs, win.id, -1)
  await chrome.windows.update(win.id, { focused: true })
}

export const activateTab = async (id) => {
  if (!id) {
    return
  }
  const tab = await chrome.tabs.get(id)
  await chrome.tabs.update(tab.id, { selected: true })
  await chrome.windows.update(tab.windowId, { focused: true })
}

export const togglePinTabs = async (tabs) => {
  await Promise.all(
    (tabs || []).map(
      async ({ id, pinned }) => {
        await chrome.tabs.update(id, { pinned: !pinned })
      }
    )
  )
}

export const openOrFocusPopup = async () => {
  const windows = await chrome.windows.getAll({ populate: true })
  const win = windows.find(isSelfPopup)
  if (!win) {
    openPopup()
  }
  chrome.windows.update(win.id, { focused: true })
}

export const openPopup = () => {
  const {
    availHeight,
    availLeft,
    availTop,
    availWidth
  } = screen
  const width = Math.max(800, availWidth / 2)
  const height = Math.max(600, availHeight / 2)
  const top = availTop + (availHeight - height) / 2
  const left = availLeft + (availWidth - width) / 2

  chrome.windows.create({
    top,
    left,
    height,
    width,
    url: popupURL,
    focused: true,
    type: 'popup'
  })
}

export const openInNewTab = () => chrome.tabs.create({ url: popupURL })

export const isSelfPopup = ({ type, tabs = [] }) => {
  if (type === 'popup' && tabs.length === 1) {
    return tabs[0].url === popupURL
  }
  return false
}

export const notSelfPopup = (...args) => !isSelfPopup(...args)

export const setLastFocusedWindowId = (lastFocusedWindowId) => {
  chrome.storage.local.set({ lastFocusedWindowId })
}

export const getLastFocusedWindowId = async () => {
  const { lastFocusedWindowId } = await chrome.storage.local.get({ lastFocusedWindowId: null })
  return lastFocusedWindowId
}

export const tabComparator = (a, b) => {
  if (a.pinned ^ b.pinned) {
    return b.pinned ? 1 : -1
  }
  if (a.url !== b.url) {
    return a.url.localeCompare(b.url)
  }
  if (a.title !== b.title) {
    return a.title.localeCompare(b.title)
  }
  return a.index - b.index
}

export const windowComparator = (a, b) => {
  if (a.lastFocused ^ b.lastFocused) {
    return b.lastFocused ? 1 : -1
  }
  if (a.focused ^ b.focused) {
    return b.focused ? 1 : -1
  }
  if (a.tabs.length !== b.tabs.length) {
    return b.tabs.length - a.tabs.length
  }
  if (a.alwaysOnTop !== b.alwaysOnTop) {
    return b.alwaysOnTop ? 1 : -1
  }
  return a.id - b.id
}
