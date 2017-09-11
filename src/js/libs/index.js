export const moveTabs = async (tabs, windowId, from = 0) => {
  await Promise.all(
    tabs.map(
      async ({ id, pinned, title }, i) => {
        const index = from + (from !== -1 ? i : 0)
        await chrome.tabs.move(id, { windowId, index })
        await chrome.tabs.update(id, { pinned })
      }
    )
  )
}

export const createWindow = async (tabs) => {
  const tabId = tabs[0].id
  const win = await chrome.windows.create({ tabId })
  await moveTabs(tabs, win.id)
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
  if (a.alwaysOnTop !== b.alwaysOnTop) {
    return b.alwaysOnTop ? 1 : -1
  }
  return a.id - b.id
}
