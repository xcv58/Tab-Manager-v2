export const popupURL = chrome.runtime.getURL('popup.html')

export const getNoun = (noun, size) => {
  if (size <= 1) {
    return noun
  }
  return noun + 's'
}

export const moveTabs = async (tabs, windowId, from = 0) => {
  await Promise.all(
    tabs.map(async ({ id, pinned }, i) => {
      const index = from + (from !== -1 ? i : 0)
      await chrome.tabs.update(id, { pinned })
      await chrome.tabs.move(id, { windowId, index })
    })
  )
}

export const createWindow = async tabs => {
  const [firstTab, ...restTabs] = tabs
  const tabId = firstTab.id
  const win = await chrome.windows.create({ tabId })
  await moveTabs(restTabs, win.id, -1)
  await chrome.windows.update(win.id, { focused: true })
}

export const activateTab = async id => {
  if (!id) {
    return
  }
  const tab = await chrome.tabs.get(id)
  await chrome.tabs.update(tab.id, { selected: true })
  await chrome.windows.update(tab.windowId, { focused: true })
}

export const togglePinTabs = async tabs => {
  await Promise.all(
    (tabs || []).map(async ({ id, pinned }) => {
      await chrome.tabs.update(id, { pinned: !pinned })
    })
  )
}

export const openOrTogglePopup = async () => {
  const windows = await chrome.windows.getAll({ populate: true })
  const win = windows.find(isSelfPopup)
  if (!win) {
    return openPopup()
  }
  const winId = win.focused ? await getLastFocusedWindowId() : win.id
  chrome.windows.update(winId, { focused: true })
}

export const MAX_WIDTH = 1024
export const MAX_HEIGHT = 768
export const getInt = number => Math.floor(number)

export const openPopup = () => {
  const { availHeight, availLeft, availTop, availWidth } = screen
  const width = getInt(Math.max(MAX_WIDTH, availWidth / 2))
  const height = getInt(Math.max(MAX_HEIGHT, availHeight / 2))
  const top = getInt(availTop + (availHeight - height) / 2)
  const left = getInt(availLeft + (availWidth - width) / 2)
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

export const setLastFocusedWindowId = lastFocusedWindowId => {
  chrome.storage.local.set({ lastFocusedWindowId })
}

export const getLastFocusedWindowId = async () => {
  const { lastFocusedWindowId } = await chrome.storage.local.get({
    lastFocusedWindowId: null
  })
  return lastFocusedWindowId
}

export const tabComparator = (a, b) => {
  if (a.pinned ^ b.pinned) {
    return b.pinned ? 1 : -1
  }
  if (a.domain !== b.domain) {
    return a.domain.localeCompare(b.domain)
  }
  if (a.title !== b.title) {
    return a.title.localeCompare(b.title)
  }
  if (a.url !== b.url) {
    return a.url.localeCompare(b.url)
  }
  return a.index - b.index
}

export const windowComparator = (a, b) => {
  if (a.alwaysOnTop !== b.alwaysOnTop) {
    return b.alwaysOnTop ? 1 : -1
  }
  // if (a.tabs.length !== b.tabs.length) {
  //   return a.tabs.length - b.tabs.length
  // }
  return a.id - b.id
}

export const ItemTypes = {
  TAB: 'tab'
}

export const TOOLTIP_DELAY = 300

export const findFirstVisibleOrFirstTab = (tabs = []) =>
  findVisibleTab(tabs, 0, 1)

export const findLastVisibleOrLastTab = (tabs = []) =>
  findVisibleTab(tabs, tabs.length - 1, -1)

export const findVisibleTab = (tabs = [], index, delta) => {
  if (tabs.length <= 0) {
    return null
  }
  let tab = tabs[index]
  while (index < tabs.length && index >= 0) {
    if (tabs[index].isVisible) {
      tab = tabs[index]
      break
    }
    index += delta
  }
  return tab
}

const urlPattern = /.*:\/\/[^/]*/

export const getDomain = url => {
  const matches = url.match(urlPattern)
  if (matches) {
    return matches[0]
  }
  return url
}
