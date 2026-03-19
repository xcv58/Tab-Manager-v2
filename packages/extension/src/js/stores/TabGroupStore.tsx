import { makeAutoObservable } from 'mobx'
import Store from 'stores'
import { browser } from 'libs'
import log from 'libs/log'
import type Tab from './Tab'
import type Window from './Window'

type TabGroupEventTarget = Pick<
  NonNullable<typeof browser.tabGroups>,
  'onCreated' | 'onRemoved' | 'onMoved' | 'onUpdated'
>

type TabGroupListeners = {
  onRemoved: (tabGroup: TabGroup) => void
  onTabGroup: (tabGroup: TabGroup) => void
}

export type TabGroup = {
  collapsed: boolean
  color: string
  id: number
  shared?: boolean
  title?: string
  windowId: number
}

export type WindowRow =
  | {
      kind: 'group'
      groupId: number
      windowId: number
      title: string
      color: string
      collapsed: boolean
      tabIds: number[]
      matchedCount: number
    }
  | {
      kind: 'tab'
      tabId: number
      windowId: number
      groupId: number
      hiddenByCollapse: boolean
    }

const getBrowserTabGroupsApi = () => browser.tabGroups

const getChromeTabGroupsApi = () => {
  if (typeof chrome === 'undefined') {
    return undefined
  }
  return chrome.tabGroups
}

const bindTabGroupListeners = (
  api: TabGroupEventTarget,
  listeners: TabGroupListeners,
) => {
  api.onCreated.addListener(listeners.onTabGroup)
  api.onRemoved.addListener(listeners.onRemoved)
  api.onMoved.addListener(listeners.onTabGroup)
  api.onUpdated.addListener(listeners.onTabGroup)
  return () => {
    api.onCreated.removeListener(listeners.onTabGroup)
    api.onRemoved.removeListener(listeners.onRemoved)
    api.onMoved.removeListener(listeners.onTabGroup)
    api.onUpdated.removeListener(listeners.onTabGroup)
  }
}

const withChromeCallback = <T,>(
  runner: (callback: (result: T) => void) => void,
) => {
  return new Promise<T>((resolve, reject) => {
    runner((result) => {
      const lastError = chrome.runtime?.lastError
      if (lastError) {
        reject(new Error(lastError.message))
        return
      }
      resolve(result)
    })
  })
}

const tabGroupsApi = {
  query: async (): Promise<TabGroup[]> => {
    const browserApi = getBrowserTabGroupsApi()
    if (browserApi?.query) {
      const tabGroups = await browserApi.query({})
      return Array.isArray(tabGroups) ? (tabGroups as TabGroup[]) : []
    }
    const chromeApi = getChromeTabGroupsApi()
    if (chromeApi?.query) {
      return withChromeCallback<TabGroup[]>((callback) => {
        chromeApi.query({}, (groups) => {
          callback((groups || []) as TabGroup[])
        })
      })
    }
    return []
  },

  get: async (groupId: number): Promise<TabGroup | null> => {
    const browserApi = getBrowserTabGroupsApi()
    if (browserApi?.get) {
      try {
        const tabGroup = await browserApi.get(groupId)
        return (tabGroup || null) as TabGroup | null
      } catch (error) {
        log.error('TabGroupStore.getGroup failed via browser API', {
          groupId,
          error,
        })
      }
    }
    const chromeApi = getChromeTabGroupsApi()
    if (chromeApi?.get) {
      try {
        return await withChromeCallback<TabGroup | null>((callback) => {
          chromeApi.get(groupId, (result) => {
            callback((result || null) as TabGroup | null)
          })
        })
      } catch (error) {
        log.error('TabGroupStore.getGroup failed via chrome API', {
          groupId,
          error,
        })
      }
    }
    return null
  },

  update: async (
    groupId: number,
    updateProperties: chrome.tabGroups.UpdateProperties,
  ): Promise<TabGroup | null> => {
    let browserError = null
    const browserApi = getBrowserTabGroupsApi()
    if (browserApi?.update) {
      try {
        const updated = await browserApi.update(groupId, updateProperties)
        return (updated || null) as TabGroup | null
      } catch (error) {
        browserError = error
      }
    }
    const chromeApi = getChromeTabGroupsApi()
    if (chromeApi?.update) {
      return withChromeCallback<TabGroup | null>((callback) => {
        chromeApi.update(groupId, updateProperties, (updated) => {
          callback((updated || null) as TabGroup | null)
        })
      })
    }
    if (browserError) {
      throw browserError
    }
    throw new Error('tabGroups.update API is unavailable')
  },

  move: async (
    groupId: number,
    moveProperties: chrome.tabGroups.MoveProperties,
  ): Promise<TabGroup | null> => {
    const browserApi = getBrowserTabGroupsApi()
    if (browserApi?.move) {
      const updated = await browserApi.move(groupId, moveProperties)
      return (updated || null) as TabGroup | null
    }
    const chromeApi = getChromeTabGroupsApi()
    if (chromeApi?.move) {
      return withChromeCallback<TabGroup | null>((callback) => {
        chromeApi.move(groupId, moveProperties, (tabGroup) => {
          callback((tabGroup || null) as TabGroup | null)
        })
      })
    }
    return null
  },

  addListeners: (listeners: TabGroupListeners) => {
    const browserApi = getBrowserTabGroupsApi()
    if (browserApi) {
      return bindTabGroupListeners(browserApi, listeners)
    }
    const chromeApi = getChromeTabGroupsApi()
    if (chromeApi) {
      return bindTabGroupListeners(chromeApi, listeners)
    }
    return null
  },

  getNoGroupId: () => {
    const browserApi = getBrowserTabGroupsApi()
    if (browserApi?.TAB_GROUP_ID_NONE != null) {
      return browserApi.TAB_GROUP_ID_NONE
    }
    const chromeApi = getChromeTabGroupsApi()
    if (chromeApi?.TAB_GROUP_ID_NONE != null) {
      return chromeApi.TAB_GROUP_ID_NONE
    }
    return null
  },

  hasApi: () => {
    return !!(getBrowserTabGroupsApi() || getChromeTabGroupsApi())
  },

  canMove: () => {
    return !!(getBrowserTabGroupsApi()?.move || getChromeTabGroupsApi()?.move)
  },

  canUpdate: () => {
    return !!(
      getBrowserTabGroupsApi()?.update || getChromeTabGroupsApi()?.update
    )
  },
}

export default class GroupStore {
  store: Store

  tabGroupMap: Map<number, TabGroup> = new Map()

  removeTabGroupListeners: (() => void) | null = null

  constructor(store: Store) {
    makeAutoObservable(this)

    this.store = store
    this.init()
  }

  init = async () => {
    try {
      if (!this.removeTabGroupListeners) {
        this.removeTabGroupListeners = tabGroupsApi.addListeners({
          onTabGroup: this.onTabGroup,
          onRemoved: this.onRemoved,
        })
      }
      const tabGroups = await tabGroupsApi.query()
      tabGroups.forEach((tabGroup) => {
        this.tabGroupMap.set(tabGroup.id, tabGroup)
      })
    } catch (error) {
      log.error('TabGroupStore.init failed', {
        error,
      })
    }
  }

  didMount = () => {
    void this.init()
  }

  willUnmount = () => {
    this.removeTabGroupListeners?.()
    this.removeTabGroupListeners = null
  }

  onTabGroup = (tabGroup: TabGroup) => {
    const previous = this.tabGroupMap.get(tabGroup.id)
    this.tabGroupMap.set(tabGroup.id, tabGroup)
    if (
      !previous ||
      previous.collapsed !== tabGroup.collapsed ||
      previous.windowId !== tabGroup.windowId ||
      previous.title !== tabGroup.title
    ) {
      this.refreshLayoutForGroupChange(
        previous && previous.windowId !== tabGroup.windowId
          ? undefined
          : tabGroup.windowId,
      )
    }
  }

  onRemoved = (tabGroup: TabGroup) => {
    this.tabGroupMap.delete(tabGroup.id)
    this.refreshLayoutForGroupChange(tabGroup.windowId)
  }

  getTabGroup = (id: number | null) => {
    return this.tabGroupMap.get(id)
  }

  hasTabGroupsApi = (): boolean => {
    return tabGroupsApi.hasApi()
  }

  getNoGroupId = () => {
    return tabGroupsApi.getNoGroupId() ?? -1
  }

  isNoGroupId = (groupId: number | null | undefined) => {
    return groupId == null || groupId === this.getNoGroupId()
  }

  getGroupsForWindow = (windowId: number) => {
    return Array.from(this.tabGroupMap.values()).filter(
      (group) => group.windowId === windowId,
    )
  }

  getTabsForGroup = (groupId: number): Tab[] => {
    if (this.isNoGroupId(groupId)) {
      return []
    }
    const tabGroup = this.getTabGroup(groupId)
    if (tabGroup) {
      const targetWindow = this.store.windowStore.windows?.find(
        (win) => win.id === tabGroup.windowId,
      )
      if (targetWindow?.getTabsForGroup) {
        return targetWindow.getTabsForGroup(groupId)
      }
    }
    return this.store.windowStore.tabs.filter((tab) => tab.groupId === groupId)
  }

  toggleSelectGroup = (groupId: number) => {
    const groupTabs = this.getTabsForGroup(groupId).filter(
      (tab) => !tab.removing,
    )
    if (!groupTabs.length) {
      return
    }
    const allSelected = groupTabs.every(this.store.tabStore.isTabSelected)
    if (allSelected) {
      this.store.tabStore.unselectAll(groupTabs)
      return
    }
    this.store.tabStore.selectAll(groupTabs)
  }

  refreshLayoutForGroupChange = (windowId?: number) => {
    if (this.store.windowStore?.refreshLayoutIfNeeded) {
      this.store.windowStore.refreshLayoutIfNeeded(
        'window-change',
        'group-browser-event',
        windowId,
      )
      return
    }
    this.store.windowStore?.markLayoutDirtyIfNeeded?.(
      'group-browser-event',
      windowId,
    )
  }

  canCreateGroupFromTabs = (tabs: Array<{ windowId?: number }> = []) => {
    if (tabs.length < 2) {
      return false
    }
    const windowId = tabs[0]?.windowId
    if (typeof windowId !== 'number') {
      return false
    }
    return tabs.every((tab) => tab.windowId === windowId)
  }

  getSharedWindowIdForTabIds = (tabIds: number[]) => {
    const currentTabs = this.store.windowStore?.tabs || []
    if (!currentTabs.length) {
      return null
    }
    const tabs = tabIds
      .map((tabId) => currentTabs.find((tab) => tab.id === tabId))
      .filter(Boolean)
    if (tabs.length !== tabIds.length) {
      return null
    }
    return this.canCreateGroupFromTabs(tabs) ? tabs[0].windowId : false
  }

  getRowsForWindow = (win: Window): WindowRow[] => {
    const rows: WindowRow[] = []
    const { tabs } = win
    const { matchedSet, _query } = this.store.searchStore
    const { showUnmatchedTab } = this.store.userStore
    const queryActive = !!_query
    const processedGroupIds = new Set<number>()

    for (let i = 0; i < tabs.length; i += 1) {
      const tab = tabs[i]
      if (this.isNoGroupId(tab.groupId)) {
        const shouldShowTab =
          !tab.removing && (tab.isMatched || showUnmatchedTab)
        if (shouldShowTab) {
          rows.push({
            kind: 'tab',
            tabId: tab.id,
            windowId: tab.windowId,
            groupId: tab.groupId,
            hiddenByCollapse: false,
          })
        }
        continue
      }

      const groupId = tab.groupId
      if (processedGroupIds.has(groupId)) {
        continue
      }
      processedGroupIds.add(groupId)

      const groupTabs = win.getTabsForGroup
        ? win.getTabsForGroup(groupId)
        : tabs.filter((candidate) => candidate.groupId === groupId)
      const resolvedGroupTabs = groupTabs.length ? groupTabs : [tab]

      const tabGroup = this.getTabGroup(groupId)
      const matchedCount = resolvedGroupTabs.filter((x) =>
        matchedSet.has(x.id),
      ).length
      const baseVisibleTabs = resolvedGroupTabs.filter(
        (x) => !x.removing && (x.isMatched || showUnmatchedTab),
      )
      if (!tabGroup) {
        baseVisibleTabs.forEach((visibleTab) => {
          rows.push({
            kind: 'tab',
            tabId: visibleTab.id,
            windowId: visibleTab.windowId,
            groupId: visibleTab.groupId,
            hiddenByCollapse: false,
          })
        })
        continue
      }

      const visibleTabs =
        tabGroup.collapsed && queryActive
          ? baseVisibleTabs.filter((x) => matchedSet.has(x.id))
          : tabGroup.collapsed
            ? []
            : baseVisibleTabs

      const shouldShowGroupRow =
        baseVisibleTabs.length > 0 || (tabGroup.collapsed && matchedCount > 0)
      if (!shouldShowGroupRow) {
        continue
      }

      rows.push({
        kind: 'group',
        groupId,
        windowId: tabGroup.windowId,
        title: tabGroup.title || 'Unnamed group',
        color: tabGroup.color,
        collapsed: tabGroup.collapsed,
        tabIds: resolvedGroupTabs.map((x) => x.id),
        matchedCount,
      })

      visibleTabs.forEach((childTab) => {
        rows.push({
          kind: 'tab',
          tabId: childTab.id,
          windowId: childTab.windowId,
          groupId: childTab.groupId,
          hiddenByCollapse: false,
        })
      })
    }
    return rows
  }

  updateTabGroup = async (
    groupId: number,
    updateProperties: chrome.tabGroups.UpdateProperties,
  ): Promise<TabGroup | null> => {
    const updated = await tabGroupsApi.update(groupId, updateProperties)
    if (updated) {
      return updated
    }
    const latest = await this.getGroup(groupId)
    if (latest) {
      return latest
    }
    throw new Error('tabGroups.update returned no value')
  }

  getGroup = async (groupId: number): Promise<TabGroup | null> => {
    if (this.isNoGroupId(groupId)) {
      return null
    }
    return tabGroupsApi.get(groupId)
  }

  groupTabsInBrowser = async (
    options: chrome.tabs.GroupOptions,
  ): Promise<number | null> => {
    if (browser.tabs?.group) {
      return browser.tabs.group(options)
    }
    if (typeof chrome !== 'undefined' && chrome.tabs?.group) {
      return await new Promise((resolve, reject) => {
        chrome.tabs.group(options, (newGroupId) => {
          const lastError = chrome.runtime?.lastError
          if (lastError) {
            reject(new Error(lastError.message))
            return
          }
          resolve(newGroupId ?? null)
        })
      })
    }
    return null
  }

  createGroup = async (
    tabIds: number[],
    createProperties?: chrome.tabs.GroupOptions['createProperties'],
  ): Promise<number | null> => {
    if (!this.canMutateGroups()) {
      return null
    }
    if (!tabIds.length) {
      return null
    }
    if (this.getSharedWindowIdForTabIds(tabIds) === false) {
      log.warn('TabGroupStore.createGroup requires tabs from the same window', {
        tabIds,
      })
      return null
    }
    const groupId = await this.groupTabsInBrowser({
      tabIds,
      createProperties,
    })
    if (groupId == null || this.isNoGroupId(groupId)) {
      return groupId
    }
    const latest = await this.getGroup(groupId)
    if (latest) {
      this.tabGroupMap.set(latest.id, latest)
    }
    return groupId
  }

  addTabsToGroup = async (
    tabIds: number[],
    groupId: number,
  ): Promise<number | null> => {
    return this.groupTabs(tabIds, groupId)
  }

  groupTabs = async (
    tabIds: number[],
    groupId: number,
  ): Promise<number | null> => {
    if (!this.canMutateGroups()) {
      return null
    }
    if (!tabIds.length) {
      return null
    }
    if (this.isNoGroupId(groupId)) {
      return this.createGroup(tabIds)
    }
    const resolvedGroupId = await this.groupTabsInBrowser({
      tabIds,
      groupId,
    })
    const groupIdToSync = resolvedGroupId ?? groupId
    if (!this.isNoGroupId(groupIdToSync)) {
      const latest = await this.getGroup(groupIdToSync)
      if (latest) {
        this.tabGroupMap.set(latest.id, latest)
      }
    }
    return resolvedGroupId
  }

  ungroupTabsInBrowser = async (tabIds: number[]): Promise<void> => {
    if (!tabIds.length) {
      return
    }
    if (browser.tabs?.ungroup) {
      await browser.tabs.ungroup(tabIds)
      return
    }
    if (typeof chrome !== 'undefined' && chrome.tabs?.ungroup) {
      await new Promise<void>((resolve, reject) => {
        chrome.tabs.ungroup(tabIds, () => {
          const lastError = chrome.runtime?.lastError
          if (lastError) {
            reject(new Error(lastError.message))
            return
          }
          resolve()
        })
      })
    }
  }

  ungroupTabs = async (tabIds: number[]): Promise<void> => {
    if (!tabIds.length) {
      return
    }
    const tabIdSet = new Set(tabIds)
    const affectedGroupIds = new Set(
      this.store.windowStore.tabs
        .filter((tab) => tabIdSet.has(tab.id))
        .map((tab) => tab.groupId)
        .filter((groupId) => !this.isNoGroupId(groupId)),
    )
    await this.ungroupTabsInBrowser(tabIds)
    await Promise.all(
      Array.from(affectedGroupIds).map(async (groupId) => {
        const latest = await this.getGroup(groupId)
        if (latest) {
          this.tabGroupMap.set(groupId, latest)
        } else {
          this.tabGroupMap.delete(groupId)
        }
      }),
    )
  }

  ungroupTab = async (tabId: number): Promise<void> => {
    await this.ungroupTabs([tabId])
  }

  moveGroup = async (
    groupId: number,
    moveProperties: chrome.tabGroups.MoveProperties,
  ): Promise<TabGroup | null> => {
    if (!this.canMoveGroups()) {
      return null
    }
    if (this.isNoGroupId(groupId)) {
      return null
    }
    const updated = await tabGroupsApi.move(groupId, moveProperties)
    if (updated) {
      this.tabGroupMap.set(updated.id, updated)
    }
    const latest = updated || (await this.getGroup(groupId))
    if (latest) {
      this.tabGroupMap.set(latest.id, latest)
    }
    return latest
  }

  canUpdateTabGroup = (): boolean => {
    return tabGroupsApi.canUpdate()
  }

  canMutateGroups = (): boolean => {
    return !!(
      this.canUpdateTabGroup() &&
      (browser.tabs?.group ||
        (typeof chrome !== 'undefined' && chrome.tabs?.group)) &&
      (browser.tabs?.ungroup ||
        (typeof chrome !== 'undefined' && chrome.tabs?.ungroup))
    )
  }

  canMoveGroups = (): boolean => {
    return tabGroupsApi.canMove()
  }

  toggleCollapsed = async (groupId: number): Promise<void> => {
    const tabGroup = this.getTabGroup(groupId)
    if (!tabGroup || !this.canUpdateTabGroup()) {
      return
    }
    const previous = tabGroup.collapsed
    const collapsed = !previous
    this.tabGroupMap.set(groupId, {
      ...tabGroup,
      collapsed,
    })
    this.store.windowStore?.markLayoutDirtyIfNeeded?.(
      'group-toggle',
      tabGroup.windowId,
    )
    try {
      const updated = await this.updateTabGroup(groupId, {
        collapsed,
      })
      const latest = updated || (await this.getGroup(groupId))
      if (latest) {
        this.tabGroupMap.set(latest.id, latest)
      }
    } catch (error) {
      this.tabGroupMap.set(groupId, {
        ...tabGroup,
        collapsed: previous,
      })
      log.error('TabGroupStore.toggleCollapsed failed', {
        groupId,
        collapsed,
        error,
      })
    }
  }

  renameGroup = async (groupId: number, title: string): Promise<void> => {
    if (!this.canUpdateTabGroup()) {
      return
    }
    const tabGroup = this.getTabGroup(groupId)
    const previousTitle = tabGroup?.title
    const didChangeTitle = previousTitle !== title
    if (tabGroup) {
      this.tabGroupMap.set(groupId, {
        ...tabGroup,
        title,
      })
      if (didChangeTitle) {
        this.refreshLayoutForGroupChange(tabGroup.windowId)
      }
    }
    try {
      const updated = await this.updateTabGroup(groupId, { title })
      const latest = updated || (await this.getGroup(groupId))
      if (latest) {
        this.tabGroupMap.set(latest.id, latest)
      }
    } catch (error) {
      if (tabGroup) {
        this.tabGroupMap.set(groupId, {
          ...tabGroup,
          title: previousTitle,
        })
        if (didChangeTitle) {
          this.refreshLayoutForGroupChange(tabGroup.windowId)
        }
      }
      log.error('TabGroupStore.renameGroup failed', {
        groupId,
        title,
        error,
      })
    }
  }

  recolorGroup = async (groupId: number, color: chrome.tabGroups.ColorEnum) => {
    if (!this.canUpdateTabGroup()) {
      return
    }
    const tabGroup = this.getTabGroup(groupId)
    const previousColor = tabGroup?.color
    if (tabGroup) {
      this.tabGroupMap.set(groupId, {
        ...tabGroup,
        color,
      })
    }
    try {
      const updated = await this.updateTabGroup(groupId, { color })
      const latest = updated || (await this.getGroup(groupId))
      if (latest) {
        this.tabGroupMap.set(latest.id, latest)
      }
    } catch (error) {
      if (tabGroup) {
        this.tabGroupMap.set(groupId, {
          ...tabGroup,
          color: previousColor,
        })
      }
      log.error('TabGroupStore.recolorGroup failed', {
        groupId,
        color,
        error,
      })
    }
  }

  ungroup = async (groupId: number): Promise<void> => {
    if (this.isNoGroupId(groupId)) {
      return
    }
    const tabs = this.getTabsForGroup(groupId)
    if (!tabs.length) {
      return
    }
    await this.ungroupTabs(tabs.map((tab) => tab.id))
    this.tabGroupMap.delete(groupId)
  }
}
