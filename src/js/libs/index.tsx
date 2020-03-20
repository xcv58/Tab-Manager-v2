import browser from 'webextension-polyfill'

export { browser }

export const TAB_HEIGHT = 42

// The not_popup=1 query indicate current page is not opened by browser_action.
// Because the browser_action can only open without any query params.
export const popupURL = browser.runtime.getURL('popup.html') + '?not_popup=1'

const closeIfCurrentTabIsPopup = () => {
  if (window.location.href !== popupURL) {
    window.close()
  }
}

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
      await browser.tabs.update(id, { pinned })
      await browser.tabs.move(id, { windowId, index })
    })
  )
}

export const createWindow = async tabs => {
  const [firstTab, ...restTabs] = tabs
  const tabId = firstTab.id
  const win = await browser.windows.create({ tabId })
  await moveTabs(restTabs, win.id, -1)
  await browser.windows.update(win.id, { focused: true })
}

export const activateTab = async (id, isBackground = false) => {
  if (!id) {
    return
  }
  const tab = await browser.tabs.get(id)
  await browser.tabs.update(tab.id, { active: true })
  await browser.windows.update(tab.windowId, { focused: true })
  if (!isBackground) {
    closeIfCurrentTabIsPopup()
  }
}

export const togglePinTabs = async tabs => {
  const sortTabs = (tabs || []).sort((a, b) => {
    if (a.windowId !== b.windowId) {
      return 0
    }
    return a.index - b.index
  })
  const pinnedTabs = sortTabs.filter(x => x.pinned).reverse()
  const unpinnedTabs = sortTabs.filter(x => !x.pinned)
  await Promise.all(
    [...pinnedTabs, ...unpinnedTabs].map(async ({ id, pinned }) => {
      await browser.tabs.update(id, { pinned: !pinned })
    })
  )
}

export const openOrTogglePopup = async () => {
  const windows = await browser.windows.getAll({ populate: true })
  const win = windows.find(isSelfPopup)
  if (!win) {
    return openPopup()
  }
  const winId = win.focused ? await getLastFocusedWindowId() : win.id
  browser.windows.update(winId, { focused: true })
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
  browser.windows.create({
    top,
    left,
    height,
    width,
    url: popupURL,
    type: 'popup'
  })
}

export const openInNewTab = () => {
  browser.tabs.create({ url: popupURL })
  closeIfCurrentTabIsPopup()
}

export const isSelfPopup = ({ type, tabs = [] }) => {
  if (type === 'popup' && tabs.length === 1) {
    return tabs[0].url === popupURL
  }
  return false
}

export const notSelfPopup = (...args) => !isSelfPopup(...args)

export const setLastFocusedWindowId = lastFocusedWindowId => {
  browser.storage.local.set({ lastFocusedWindowId })
}

export const getLastFocusedWindowId = async () => {
  try {
    const { lastFocusedWindowId } = await browser.storage.local.get({
      lastFocusedWindowId: null
    })
    return lastFocusedWindowId
  } catch (e) {
    return null
  }
}

export const tabComparator = (a, b) => {
  if (a.pinned ^ b.pinned) {
    return b.pinned ? 1 : -1
  }
  if (a.domain !== b.domain) {
    return a.domain.localeCompare(b.domain)
  } else if (a.url !== b.url) {
    return a.url.localeCompare(b.url)
  } else if (a.title !== b.title) {
    return a.title.localeCompare(b.title)
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
