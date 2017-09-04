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
    index += 1
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
