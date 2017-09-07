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

export const activateTab = (id) => {
  if (!id) {
    return
  }
  chrome.tabs.get(id, (tab) => {
    chrome.tabs.update(tab.id, { selected: true })
    chrome.windows.update(tab.windowId, { focused: true })
  })
}

export const tabComparator = (a, b) => {
  if (a.url === b.url) {
    if (a.title === b.title) {
      return a.index - b.index
    }
    return a.title.localeCompare(b.title)
  }
  return a.url.localeCompare(b.url)
}
