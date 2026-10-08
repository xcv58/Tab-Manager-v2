import browser from 'webextension-polyfill'
import log from 'libs/log'

export { browser }

export const NOT_POPUP = 'not_popup'

// The not_popup=1 query indicate current page is not opened by browser_action.
// Because the browser_action can only open without any query params.
export const popupURL = browser.runtime.getURL('popup.html') + `?${NOT_POPUP}=1`

const closeIfCurrentTabIsPopup = () => {
  if (typeof window !== 'undefined' && window.location.href !== popupURL) {
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
  if (!tabs || tabs.length === 0) {
    return
  }

  // Read active state from the browser: the store can be suspended during drops.
  // Keep the caller's pinned value because domain grouping can change pinning.
  const currentTabs = await Promise.all(
    tabs.map(async (tab) => {
      const current = await browser.tabs.get(tab.id)
      return { ...tab, ...current, pinned: tab.pinned ?? current?.pinned }
    }),
  )
  // Beginning means the start of each pin class. Source windows can contribute
  // unpinned tabs before pins, so place pins first without changing class order.
  const movingTabs =
    from === 0
      ? [
          ...currentTabs.filter((tab) => tab.pinned),
          ...currentTabs.filter((tab) => !tab.pinned),
        ]
      : currentTabs
  let destination = (await browser.tabs.query({ windowId }))
    .filter((tab) => tab.windowId === windowId)
    .sort((a, b) => a.index - b.index)

  const insertIndex = (list, tab, index) => {
    const pinnedCount = list.filter((item) => item.pinned).length
    const requested = index === -1 ? list.length : Math.max(0, index)
    return tab.pinned
      ? Math.min(requested, pinnedCount)
      : Math.min(list.length, Math.max(requested, pinnedCount))
  }
  const track = (tab) => {
    if (!tab || tab.windowId !== windowId) {
      return
    }
    destination = destination.filter((item) => item.id !== tab.id)
    destination.splice(tab.index, 0, tab)
  }
  const moveOne = async (tab, index) => {
    track(await browser.tabs.update(tab.id, { pinned: tab.pinned }))
    const remaining = destination.filter((item) => item.id !== tab.id)
    const position = insertIndex(remaining, tab, index)
    const moveIndex = index === -1 && !tab.pinned ? -1 : position
    const result = await browser.tabs.move(tab.id, {
      windowId,
      index: moveIndex,
    })
    const moved = Array.isArray(result) ? result[0] : result
    if (Array.isArray(result) && !moved) {
      throw new Error(`Tab ${tab.id} was not moved to window ${windowId}`)
    }
    track(moved ?? { ...tab, windowId, index: position })
    // Chromium can unpin a tab when transferring it between windows.
    if (moved && moved.pinned !== tab.pinned) {
      const restored = await browser.tabs.update(tab.id, {
        pinned: tab.pinned,
      })
      track(restored)
    }
    // Firefox can retain pinning but append transferred pins to the pinned
    // section instead of honoring the requested cross-window index.
    const placed = destination.find((item) => item.id === tab.id)
    if (placed && placed.index !== position) {
      const repositioned = await browser.tabs.move(tab.id, {
        windowId,
        index: position,
      })
      track(Array.isArray(repositioned) ? repositioned[0] : repositioned)
    }
  }

  const deferredIds = new Set(
    movingTabs
      .filter((tab) => tab.active && tab.windowId !== windowId)
      .map((tab) => tab.id),
  )
  if (!deferredIds.size) {
    let cursor = from
    const movedIds = new Set()
    for (let i = 0; i < movingTabs.length; i++) {
      await moveOne(
        movingTabs[i],
        from === 0 ? cursor : from === -1 ? -1 : from + i,
      )
      if (from === 0) {
        // Beginning moves can be clamped past the destination's pinned tabs.
        // Continue after the tabs already placed so that clamp keeps their order.
        movedIds.add(movingTabs[i].id)
        cursor = destination.reduce(
          (next, tab, index) => (movedIds.has(tab.id) ? index + 1 : next),
          0,
        )
      }
    }
    return
  }

  // Preserve caller order while respecting the pinned boundary, without
  // activating discarded successors when the source active tab is removed.
  let planned = destination.slice()
  let cursor = from
  const plannedIds = new Set()
  movingTabs.forEach((tab) => {
    planned = planned.filter((item) => item.id !== tab.id)
    const position = insertIndex(planned, tab, cursor)
    planned.splice(position, 0, tab)
    plannedIds.add(tab.id)
    if (from !== -1) {
      // A pinned insertion can land before previously planned unpinned tabs.
      // Continue after the last planned moving tab to preserve caller order.
      let last = position
      for (let i = planned.length - 1; i > position; i--) {
        if (plannedIds.has(planned[i].id)) {
          last = i
          break
        }
      }
      cursor = last + 1
    }
  })
  const pendingIds = new Set(movingTabs.map((tab) => tab.id))
  const selected = planned.filter((tab) => pendingIds.has(tab.id)).reverse()
  const order = [
    ...selected.filter((tab) => !deferredIds.has(tab.id)),
    ...selected.filter((tab) => deferredIds.has(tab.id)),
  ]
  for (const tab of order) {
    pendingIds.delete(tab.id)
    const remaining = destination.filter((item) => item.id !== tab.id)
    const next = planned
      .slice(planned.findIndex((item) => item.id === tab.id) + 1)
      .find(
        (item) =>
          !pendingIds.has(item.id) &&
          remaining.some((candidate) => candidate.id === item.id),
      )
    const index = next ? remaining.findIndex((item) => item.id === next.id) : -1
    await moveOne(tab, index)
  }
}

const getNoGroupId = () => browser.tabGroups?.TAB_GROUP_ID_NONE ?? -1

const isNoGroupId = (groupId) => {
  return groupId == null || groupId === getNoGroupId()
}

const getTabsInVisibleOrder = (tabs) => {
  return tabs.slice().sort((a, b) => {
    return (a.index ?? 0) - (b.index ?? 0)
  })
}

const getBrowserTabGroup = async (groupId) => {
  if (browser.tabGroups?.get) {
    return browser.tabGroups.get(groupId)
  }
  if (typeof chrome !== 'undefined' && chrome.tabGroups?.get) {
    return await new Promise((resolve) => {
      chrome.tabGroups.get(groupId, (group) => {
        resolve(group || null)
      })
    })
  }
  return null
}

const updateBrowserTabGroup = async (groupId, updateProperties) => {
  if (browser.tabGroups?.update) {
    return browser.tabGroups.update(groupId, updateProperties)
  }
  if (typeof chrome !== 'undefined' && chrome.tabGroups?.update) {
    return await new Promise((resolve, reject) => {
      chrome.tabGroups.update(groupId, updateProperties, (group) => {
        const lastError = chrome.runtime?.lastError
        if (lastError) {
          reject(new Error(lastError.message))
          return
        }
        resolve(group || null)
      })
    })
  }
  return null
}

const groupTabsInBrowser = async (tabIds) => {
  if (!tabIds.length) {
    return null
  }
  if (browser.tabs?.group) {
    return browser.tabs.group({ tabIds })
  }
  if (typeof chrome !== 'undefined' && chrome.tabs?.group) {
    return await new Promise((resolve, reject) => {
      chrome.tabs.group({ tabIds }, (groupId) => {
        const lastError = chrome.runtime?.lastError
        if (lastError) {
          reject(new Error(lastError.message))
          return
        }
        resolve(groupId ?? null)
      })
    })
  }
  return null
}

const ungroupTabsInBrowser = async (tabIds) => {
  if (!tabIds.length) {
    return
  }
  if (browser.tabs?.ungroup) {
    await browser.tabs.ungroup(tabIds)
    return
  }
  if (typeof chrome !== 'undefined' && chrome.tabs?.ungroup) {
    await new Promise((resolve, reject) => {
      chrome.tabs.ungroup(tabIds, () => {
        const lastError = chrome.runtime?.lastError
        if (lastError) {
          reject(new Error(lastError.message))
          return
        }
        resolve(undefined)
      })
    })
  }
}

const hydrateTabsForGrouping = async (tabs) => {
  return Promise.all(
    tabs.map(async (tab) => {
      const needsHydration =
        typeof tab.windowId !== 'number' ||
        typeof tab.index !== 'number' ||
        typeof tab.groupId !== 'number'
      if (!needsHydration) {
        return tab
      }
      try {
        const hydrated = await browser.tabs.get(tab.id)
        return hydrated ? { ...tab, ...hydrated } : tab
      } catch {
        return tab
      }
    }),
  )
}

const getSelectedGroupPlans = async (tabs) => {
  const tabsByWindowId = new Map()
  const windowIdsInOrder = []
  tabs.forEach((tab) => {
    if (!tabsByWindowId.has(tab.windowId)) {
      tabsByWindowId.set(tab.windowId, [])
      windowIdsInOrder.push(tab.windowId)
    }
    tabsByWindowId.get(tab.windowId).push(tab)
  })

  const wholeGroupPlans = []
  const partialGroupTabIds = []

  for (const windowId of windowIdsInOrder) {
    const selectedTabs = tabsByWindowId.get(windowId) || []
    const sourceTabs = getTabsInVisibleOrder(
      await browser.tabs.query({ windowId }),
    )
    const selectedIds = new Set(selectedTabs.map((tab) => tab.id))
    const seenGroupIds = new Set()

    for (const tab of selectedTabs) {
      if (isNoGroupId(tab.groupId) || seenGroupIds.has(tab.groupId)) {
        continue
      }
      seenGroupIds.add(tab.groupId)
      const selectedGroupTabs = selectedTabs.filter(
        (candidate) => candidate.groupId === tab.groupId,
      )
      const sourceGroupTabs = sourceTabs.filter(
        (candidate) => candidate.groupId === tab.groupId,
      )
      const isWholeGroup =
        sourceGroupTabs.length > 0 &&
        sourceGroupTabs.length === selectedGroupTabs.length &&
        sourceGroupTabs.every((candidate) => selectedIds.has(candidate.id))
      if (isWholeGroup) {
        wholeGroupPlans.push({
          groupId: tab.groupId,
          tabIds: selectedGroupTabs.map((candidate) => candidate.id),
          tabGroup: await getBrowserTabGroup(tab.groupId),
        })
      } else {
        partialGroupTabIds.push(
          ...selectedGroupTabs.map((candidate) => candidate.id),
        )
      }
    }
  }

  return { wholeGroupPlans, partialGroupTabIds }
}

export const createWindow = async (tabs) => {
  if (!tabs || tabs.length === 0) {
    return
  }
  const hydratedTabs = await hydrateTabsForGrouping(tabs)
  const { wholeGroupPlans, partialGroupTabIds } =
    await getSelectedGroupPlans(hydratedTabs)
  const [firstTab, ...restTabs] = tabs
  const tabId = firstTab.id
  const win = await browser.windows.create({ tabId })
  await moveTabs(restTabs, win.id, -1)
  await ungroupTabsInBrowser(partialGroupTabIds)
  for (const plan of wholeGroupPlans) {
    const newGroupId = await groupTabsInBrowser(plan.tabIds)
    if (newGroupId == null || !plan.tabGroup) {
      continue
    }
    await updateBrowserTabGroup(newGroupId, {
      title: plan.tabGroup.title,
      color: plan.tabGroup.color,
      collapsed: plan.tabGroup.collapsed,
    })
  }
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

export const togglePinTabs = async (tabs) => {
  const sortTabs = (tabs || []).sort((a, b) => {
    if (a.windowId !== b.windowId) {
      return 0
    }
    return a.index - b.index
  })
  const pinnedTabs = sortTabs.filter((x) => x.pinned).reverse()
  const unpinnedTabs = sortTabs.filter((x) => !x.pinned)
  await Promise.all(
    [...pinnedTabs, ...unpinnedTabs].map(async ({ id, pinned }) => {
      await browser.tabs.update(id, { pinned: !pinned })
    }),
  )
}

const focusOnLastFocusedWin = async () => {
  log.debug('focusOnLastFocusedWin')
  const windows = await browser.windows.getAll({ populate: true })
  const lastFocusedWindowId = await getLastFocusedWindowId()
  if (windows.find((win) => win.id === lastFocusedWindowId)) {
    log.debug(
      'focusOnLastFocusedWin focus on valid lastFocusedWindowId:',
      lastFocusedWindowId,
    )
    return browser.windows.update(lastFocusedWindowId, { focused: true })
  }
  const win = windows.find((win) => !isSelfPopup(win))
  if (win) {
    log.debug(
      'focusOnLastFocusedWin lastFocusedWindowId is invalid, focused on the first window',
      { win, lastFocusedWindowId },
    )
    return browser.windows.update(win.id, { focused: true })
  }
  log.error(
    'focusOnLastFocusedWin lastFocusedWindowId is invalid, and no active window to focus',
  )
}

export const openOrTogglePopup = async () => {
  log.debug('openOrTogglePopup')
  const { _selfPopupActive } = await browser.storage.local.get({
    _selfPopupActive: false,
  })
  if (_selfPopupActive) {
    return focusOnLastFocusedWin()
  }
  const windows = await browser.windows.getAll({ populate: true })
  const win = windows.find(isSelfPopup)
  log.debug('openOrTogglePopup win:', { win })
  if (!win) {
    return openPopup()
  }
  log.debug('openOrTogglePopup focus popup window:', { win })
  browser.windows.update(win.id, { focused: true })
}

export const MAX_WIDTH = 1024
export const MAX_HEIGHT = 768
export const getInt = (number) => Math.floor(number)

export const openPopup = async () => {
  log.debug('openPopup')
  const {
    availHeight = 500,
    availLeft = 0,
    availTop = 0,
    availWidth = 500,
  } = await browser.storage.local.get([
    'availHeight',
    'availLeft',
    'availTop',
    'availWidth',
  ])
  log.debug('openPopup', { availHeight, availLeft, availTop, availWidth })
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
    type: 'popup',
  })
}

export const openInNewTab = () => {
  browser.tabs.create({ url: popupURL })
  closeIfCurrentTabIsPopup()
}

export const openURL = (url: string) => browser.tabs.create({ url })

export const isSelfPopupTab = (tab) =>
  tab.url === popupURL || tab.pendingUrl === popupURL

export const isSelfPopup = ({ type, tabs = [] }) => {
  if (type === 'popup' && tabs.length === 1) {
    return isSelfPopupTab(tabs[0])
  }
  return false
}

export const notSelfPopup = (...args) => !isSelfPopup(...args)

export const setLastFocusedWindowId = (lastFocusedWindowId) => {
  browser.storage.local.set({ lastFocusedWindowId, _selfPopupActive: false })
}

export const setSelfPopupActive = (_selfPopupActive) => {
  log.debug('setSelfPopupActive:', { _selfPopupActive })
  return browser.storage.local.set({ _selfPopupActive })
}

export const getLastFocusedWindowId = async () => {
  try {
    const { lastFocusedWindowId } = await browser.storage.local.get({
      lastFocusedWindowId: null,
    })
    return lastFocusedWindowId
  } catch {
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
  TAB: 'tab',
}

export const TOOLTIP_DELAY = 300

export const findFirstVisibleOrFirstTab = (tabs = []) =>
  findVisibleTab(tabs, 0, 1)

export const findLastVisibleOrLastTab = (tabs = []) =>
  findVisibleTab(tabs, tabs.length - 1, -1)

export const findVisibleTab = (tabs = [], index = 0, delta = 1) => {
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

export const getDomain = (url) => {
  const matches = url.match(urlPattern)
  if (matches) {
    return matches[0]
  }
  return url
}

export const isProduction = () => process.env.NODE_ENV === 'production'

export const writeToClipboard = (text) => navigator.clipboard.writeText(text)
