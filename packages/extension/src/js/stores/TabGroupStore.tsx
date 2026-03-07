import { makeAutoObservable } from 'mobx'
import Store from 'stores'
import { browser } from 'libs'
import log from 'libs/log'
import type Tab from './Tab'
import type Window from './Window'

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

export default class GroupStore {
  store: Store

  tabGroupMap: Map<number, TabGroup> = new Map()

  constructor(store: Store) {
    makeAutoObservable(this)

    this.store = store
    this.init()
  }

  init = async () => {
    try {
      if (browser.tabGroups) {
        const tabGroups = await browser.tabGroups.query({})
        if (Array.isArray(tabGroups)) {
          tabGroups.forEach((tabGroup) => {
            this.tabGroupMap.set(tabGroup.id, tabGroup)
          })
        }
        browser.tabGroups.onCreated.addListener(this.onTabGroup)
        browser.tabGroups.onRemoved.addListener(this.onRemoved)
        browser.tabGroups.onMoved.addListener(this.onTabGroup)
        browser.tabGroups.onUpdated.addListener(this.onTabGroup)
        return
      }
      if (typeof chrome !== 'undefined' && chrome.tabGroups) {
        const tabGroups = await new Promise<TabGroup[]>((resolve, reject) => {
          chrome.tabGroups.query({}, (groups) => {
            const lastError = chrome.runtime?.lastError
            if (lastError) {
              reject(new Error(lastError.message))
              return
            }
            resolve((groups || []) as TabGroup[])
          })
        })
        tabGroups.forEach((tabGroup) => {
          this.tabGroupMap.set(tabGroup.id, tabGroup)
        })
        chrome.tabGroups.onCreated.addListener(this.onTabGroup)
        chrome.tabGroups.onRemoved.addListener(this.onRemoved)
        chrome.tabGroups.onMoved.addListener(this.onTabGroup)
        chrome.tabGroups.onUpdated.addListener(this.onTabGroup)
      }
    } catch (error) {
      log.error('TabGroupStore.init failed', {
        error,
      })
    }
  }

  onTabGroup = (tabGroup: TabGroup) => {
    const previous = this.tabGroupMap.get(tabGroup.id)
    this.tabGroupMap.set(tabGroup.id, tabGroup)
    if (
      !previous ||
      previous.collapsed !== tabGroup.collapsed ||
      previous.windowId !== tabGroup.windowId
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
    return !!(
      browser.tabGroups ||
      (typeof chrome !== 'undefined' && chrome.tabGroups)
    )
  }

  getNoGroupId = () => {
    if (browser.tabGroups?.TAB_GROUP_ID_NONE != null) {
      return browser.tabGroups.TAB_GROUP_ID_NONE
    }
    if (
      typeof chrome !== 'undefined' &&
      chrome.tabGroups?.TAB_GROUP_ID_NONE != null
    ) {
      return chrome.tabGroups.TAB_GROUP_ID_NONE
    }
    return -1
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
    return this.store.windowStore.tabs.filter((tab) => tab.groupId === groupId)
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
    const groupedTabsById = new Map<number, Tab[]>()

    tabs.forEach((tab) => {
      if (this.isNoGroupId(tab.groupId)) {
        return
      }
      const existing = groupedTabsById.get(tab.groupId) || []
      existing.push(tab)
      groupedTabsById.set(tab.groupId, existing)
    })

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

      const groupTabs = groupedTabsById.get(groupId) || [tab]

      const tabGroup = this.getTabGroup(groupId)
      const matchedCount = groupTabs.filter((x) => matchedSet.has(x.id)).length
      const baseVisibleTabs = groupTabs.filter(
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
        tabIds: groupTabs.map((x) => x.id),
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
    let browserError = null
    if (browser.tabGroups?.update) {
      try {
        const updated = await browser.tabGroups.update(
          groupId,
          updateProperties,
        )
        if (updated) {
          return updated as TabGroup
        }
        const latest = await this.getGroup(groupId)
        if (latest) {
          return latest
        }
        browserError = new Error('browser.tabGroups.update returned no value')
      } catch (error) {
        browserError = error
      }
    }
    if (typeof chrome !== 'undefined' && chrome.tabGroups?.update) {
      return await new Promise((resolve, reject) => {
        chrome.tabGroups.update(groupId, updateProperties, (updated) => {
          const lastError = chrome.runtime?.lastError
          if (lastError) {
            reject(new Error(lastError.message))
            return
          }
          resolve((updated || null) as TabGroup | null)
        })
      })
    }
    if (browserError) {
      throw browserError
    }
    throw new Error('tabGroups.update API is unavailable')
  }

  getGroup = async (groupId: number): Promise<TabGroup | null> => {
    if (this.isNoGroupId(groupId)) {
      return null
    }
    if (browser.tabGroups?.get) {
      try {
        const tabGroup = await browser.tabGroups.get(groupId)
        return (tabGroup || null) as TabGroup | null
      } catch (error) {
        log.error('TabGroupStore.getGroup failed via browser API', {
          groupId,
          error,
        })
      }
    }
    if (typeof chrome !== 'undefined' && chrome.tabGroups?.get) {
      try {
        const tabGroup = await new Promise<TabGroup | null>(
          (resolve, reject) => {
            chrome.tabGroups.get(groupId, (result) => {
              const lastError = chrome.runtime?.lastError
              if (lastError) {
                reject(new Error(lastError.message))
                return
              }
              resolve((result || null) as TabGroup | null)
            })
          },
        )
        return tabGroup
      } catch (error) {
        log.error('TabGroupStore.getGroup failed via chrome API', {
          groupId,
          error,
        })
      }
    }
    return null
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
    if (browser.tabGroups?.move) {
      const updated = await browser.tabGroups.move(groupId, moveProperties)
      if (updated) {
        this.tabGroupMap.set(updated.id, updated as TabGroup)
        return updated as TabGroup
      }
      const latest = await this.getGroup(groupId)
      if (latest) {
        this.tabGroupMap.set(latest.id, latest)
      }
      return latest
    }
    if (typeof chrome !== 'undefined' && chrome.tabGroups?.move) {
      const updated = await new Promise<TabGroup | null>((resolve, reject) => {
        chrome.tabGroups.move(groupId, moveProperties, (tabGroup) => {
          const lastError = chrome.runtime?.lastError
          if (lastError) {
            reject(new Error(lastError.message))
            return
          }
          resolve((tabGroup || null) as TabGroup | null)
        })
      })
      if (updated) {
        this.tabGroupMap.set(updated.id, updated)
      }
      const latest = updated || (await this.getGroup(groupId))
      if (latest) {
        this.tabGroupMap.set(latest.id, latest)
      }
      return latest
    }
    return null
  }

  canUpdateTabGroup = (): boolean => {
    return !!(
      browser.tabGroups?.update ||
      (typeof chrome !== 'undefined' && chrome.tabGroups?.update)
    )
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
    return !!(
      browser.tabGroups?.move ||
      (typeof chrome !== 'undefined' && chrome.tabGroups?.move)
    )
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
    if (tabGroup) {
      this.tabGroupMap.set(groupId, {
        ...tabGroup,
        title,
      })
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
