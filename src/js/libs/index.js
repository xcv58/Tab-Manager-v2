export const moveTabs = (tabs, windowId, from = 0) => {
  let index = from
  tabs.map(({ id, pinned }) => {
    chrome.tabs.move(
      id,
      { windowId, index },
      () => {
        chrome.tabs.update(id, { pinned })
      }
    )
    if (index !== -1) {
      index += 1
    }
  })
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
    return a.title.localeCompare(b.title)
  }
  return a.url.localeCompare(b.url)
}
