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
