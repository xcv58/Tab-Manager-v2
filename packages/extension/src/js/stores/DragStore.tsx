import { makeAutoObservable } from 'mobx'
import Store from 'stores'
import Tab from './Tab'
import log from 'libs/log'
import { browser } from 'libs'

export type DropSource = 'tab-row' | 'group-header' | 'window-zone'

export type DropAtOptions = {
  windowId: number
  index: number
  targetGroupId?: number
  targetTabId?: number
  before?: boolean
  forceUngroup?: boolean
  source?: DropSource
}

export default class DragStore {
  store: Store

  constructor(store: Store) {
    makeAutoObservable(this)

    this.store = store
  }

  dropped = false

  dragging = false

  dragSource: DropSource = 'tab-row'

  dragStartTab = (tab: Tab) => {
    tab.unhover()
    this.dropped = false
    this.dragging = true
    this.dragSource = 'tab-row'
    const { selection, unselectAll } = this.store.tabStore
    if (!selection.has(tab.id)) {
      unselectAll()
    }
    selection.set(tab.id, tab)
    return selection
  }

  dragStartGroup = (groupId: number) => {
    this.dropped = false
    this.dragging = true
    this.dragSource = 'group-header'
    const { selection, unselectAll } = this.store.tabStore
    unselectAll()
    if (this.isNoGroupId(groupId) || !this.store.tabGroupStore) {
      return selection
    }
    this.store.tabGroupStore.getTabsForGroup(groupId).forEach((tab) => {
      selection.set(tab.id, tab)
    })
    return selection
  }

  dragStart = (tab: Tab) => this.dragStartTab(tab)

  dragEnd = () => {
    this.dragging = false
    this.dragSource = 'tab-row'
    if (!this.dropped) {
      this.clear()
    }
  }

  clear = () => {
    this.clearSelection()
    this.dropped = false
  }

  clearSelection = () => {
    this.store.tabStore.selection.clear()
  }

  getUnselectedTabs = (tabs: Tab[]) => {
    return tabs.filter((x) => !this.store.tabStore.selection.has(x.id))
  }

  getNoGroupId = () => this.store.tabGroupStore?.getNoGroupId?.() ?? -1

  hasTabGroupsApi = () => !!this.store.tabGroupStore?.hasTabGroupsApi?.()

  canMutateGroups = () => !!this.store.tabGroupStore?.canMutateGroups?.()

  canMoveGroups = () => !!this.store.tabGroupStore?.canMoveGroups?.()

  isNoGroupId = (groupId: number) => groupId === this.getNoGroupId()

  getGroupBounds = (tabs: Tab[], groupId: number) => {
    if (this.isNoGroupId(groupId)) {
      return null
    }
    let start = -1
    let end = -1
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i].groupId !== groupId) {
        continue
      }
      if (start === -1) {
        start = i
      }
      end = i
    }
    if (start === -1 || end === -1) {
      return null
    }
    return { start, end }
  }

  getSingleGroupId = (tabs: Tab[]) => {
    if (!tabs.length) {
      return this.getNoGroupId()
    }
    const firstGroupId = tabs[0].groupId
    if (this.isNoGroupId(firstGroupId)) {
      return this.getNoGroupId()
    }
    const allFromSameGroup = tabs.every((x) => x.groupId === firstGroupId)
    if (!allFromSameGroup) {
      return this.getNoGroupId()
    }
    return firstGroupId
  }

  isWholeGroupSelection = (groupId: number, tabs: Tab[]) => {
    if (this.isNoGroupId(groupId) || !this.store.tabGroupStore) {
      return false
    }
    const groupTabs = this.store.tabGroupStore.getTabsForGroup(groupId)
    if (!groupTabs.length || groupTabs.length !== tabs.length) {
      return false
    }
    const selectedIds = new Set(tabs.map((x) => x.id))
    return groupTabs.every((x) => selectedIds.has(x.id))
  }

  getTargetIndex = (winTabs: Tab[], targetTab: Tab, before: boolean) => {
    const targetGroupId = targetTab.groupId
    if (
      !this.hasTabGroupsApi() ||
      this.isNoGroupId(targetGroupId) ||
      !this.store.tabGroupStore
    ) {
      return targetTab.index + (before ? 0 : 1)
    }
    const sourceGroupId = this.getSingleGroupId(this.store.tabStore.sources)
    if (sourceGroupId === targetGroupId) {
      return targetTab.index + (before ? 0 : 1)
    }
    const bounds = this.getGroupBounds(winTabs, targetGroupId)
    if (!bounds) {
      return targetTab.index + (before ? 0 : 1)
    }
    return before ? bounds.start : bounds.end + 1
  }

  getResolvedTargetIndex = (winTabs: Tab[], options: DropAtOptions) => {
    const { source, targetGroupId, index } = options
    if (
      source === 'group-header' &&
      targetGroupId != null &&
      !this.isNoGroupId(targetGroupId)
    ) {
      const bounds = this.getGroupBounds(winTabs, targetGroupId)
      if (bounds) {
        return bounds.start
      }
    }
    return index
  }

  getTargetGroupOffset = (
    winTabs: Tab[],
    targetGroupId: number,
    targetIndex: number,
  ) => {
    if (this.isNoGroupId(targetGroupId)) {
      return 0
    }
    const bounds = this.getGroupBounds(winTabs, targetGroupId)
    if (!bounds) {
      return 0
    }
    const groupSize = bounds.end - bounds.start + 1
    return Math.max(0, Math.min(targetIndex - bounds.start, groupSize))
  }

  getWindowTabsFromBrowser = async (windowId: number) => {
    const tabs = await browser.tabs.query({ windowId })
    return tabs.slice().sort((a, b) => {
      return (a.index ?? 0) - (b.index ?? 0)
    })
  }

  joinUngroupedTabsToTargetGroup = async ({
    sources,
    sourceTabIds,
    windowId,
    targetGroupId,
    targetGroupOffset,
    targetTabId,
    before,
    fallbackIndex,
  }: {
    sources: Tab[]
    sourceTabIds: number[]
    windowId: number
    targetGroupId: number
    targetGroupOffset: number
    targetTabId?: number
    before?: boolean
    fallbackIndex: number
  }) => {
    const initialTabs = await this.getWindowTabsFromBrowser(windowId)
    const initialBounds = this.getGroupBounds(initialTabs as any, targetGroupId)
    const { moveTabs } = this.store.windowStore
    const inSameWindow = sources.every((tab) => tab.windowId === windowId)

    if (!initialBounds) {
      if (!inSameWindow) {
        await moveTabs(sources, windowId, fallbackIndex)
      }
      await this.store.tabGroupStore.groupTabs(sourceTabIds, targetGroupId)
      return
    }

    const stageIndex = Math.min(initialBounds.end + 1, initialTabs.length)
    let resolvedTargetGroupOffset = targetGroupOffset
    if (typeof targetTabId === 'number') {
      const actualTargetIndex = initialTabs.findIndex(
        (tab) => tab.id === targetTabId,
      )
      if (actualTargetIndex > -1) {
        const groupSize = initialBounds.end - initialBounds.start + 1
        resolvedTargetGroupOffset = Math.max(
          0,
          Math.min(
            actualTargetIndex - initialBounds.start + (before ? 0 : 1),
            groupSize,
          ),
        )
      }
    }
    await moveTabs(sources, windowId, stageIndex)
    await this.store.tabGroupStore.groupTabs(sourceTabIds, targetGroupId)

    const groupedTabs = await this.getWindowTabsFromBrowser(windowId)
    const groupedBounds = this.getGroupBounds(groupedTabs as any, targetGroupId)
    if (!groupedBounds) {
      return
    }

    const finalIndex = Math.max(
      groupedBounds.start,
      Math.min(
        groupedBounds.start + resolvedTargetGroupOffset,
        groupedBounds.end + 1,
      ),
    )
    await moveTabs(sources, windowId, finalIndex)
  }

  drop = async (tab: Tab, before = true) => {
    return this.dropAt({
      windowId: tab.windowId,
      index: tab.index + (before ? 0 : 1),
      targetGroupId: tab.groupId,
      targetTabId: tab.id,
      before,
      source: 'tab-row',
    })
  }

  dropAt = async (options: DropAtOptions) => {
    const { moveTabs, getTargetWindow, suspend, resume } =
      this.store.windowStore
    suspend()
    try {
      const sources = this.store.tabStore.sources
      if (!sources.length) {
        return
      }
      const sourceGroupId = this.getSingleGroupId(sources)
      const wholeGroupSelection = this.isWholeGroupSelection(
        sourceGroupId,
        sources,
      )
      const sourceTabIds = sources.map((x) => x.id)
      const groupedSourceTabIds = sources
        .filter((x) => !this.isNoGroupId(x.groupId))
        .map((x) => x.id)
      const { windowId } = options
      const win = getTargetWindow(windowId)
      const targetGroupId = options.targetGroupId ?? this.getNoGroupId()
      const targetIndex = Math.max(
        0,
        Math.min(
          this.getResolvedTargetIndex(win.tabs, options),
          win.tabs.length,
        ),
      )
      const index = this.getUnselectedTabs(
        win.tabs.slice(0, targetIndex),
      ).length
      const hasTabGroupFlow =
        this.hasTabGroupsApi() && !!this.store.tabGroupStore
      const hasTargetGroup = !this.isNoGroupId(targetGroupId)
      const targetGroupOffset = this.getTargetGroupOffset(
        win.tabs,
        targetGroupId,
        targetIndex,
      )
      const canMoveGroup =
        hasTabGroupFlow &&
        this.canMoveGroups() &&
        !this.isNoGroupId(sourceGroupId) &&
        sourceGroupId !== targetGroupId &&
        wholeGroupSelection &&
        !options.forceUngroup
      const shouldJoinTargetGroup =
        hasTabGroupFlow &&
        this.canMutateGroups() &&
        hasTargetGroup &&
        sourceGroupId !== targetGroupId &&
        !wholeGroupSelection &&
        !options.forceUngroup
      const shouldDetachFromSourceGroup =
        hasTabGroupFlow &&
        this.canMutateGroups() &&
        !wholeGroupSelection &&
        groupedSourceTabIds.length > 0 &&
        (!!options.forceUngroup || !hasTargetGroup)
      let movedByGroupApi = false
      if (canMoveGroup) {
        await this.store.tabGroupStore.moveGroup(sourceGroupId, {
          windowId,
          index,
        })
        movedByGroupApi = true
      }
      if (!movedByGroupApi) {
        if (shouldDetachFromSourceGroup) {
          await this.store.tabGroupStore.ungroupTabs(groupedSourceTabIds)
        }
        if (shouldJoinTargetGroup) {
          const isUngroupedJoin =
            this.isNoGroupId(sourceGroupId) && groupedSourceTabIds.length === 0
          if (isUngroupedJoin) {
            await this.joinUngroupedTabsToTargetGroup({
              sources,
              sourceTabIds,
              windowId,
              targetGroupId,
              targetGroupOffset,
              targetTabId: options.targetTabId,
              before: options.before,
              fallbackIndex: index,
            })
          } else {
            const inSameWindow = sources.every(
              (tab) => tab.windowId === windowId,
            )
            if (!inSameWindow) {
              await moveTabs(sources, windowId, index)
            }
            const targetGroupTabIds = this.store.tabGroupStore
              .getTabsForGroup(targetGroupId)
              .slice()
              .sort((a, b) => a.index - b.index)
              .map((tab) => tab.id)
            const sourceTabIdSet = new Set(sourceTabIds)
            const preservedTargetTabIds = targetGroupTabIds.filter(
              (tabId) => !sourceTabIdSet.has(tabId),
            )
            const insertOffset = Math.max(
              0,
              Math.min(targetGroupOffset, preservedTargetTabIds.length),
            )
            const orderedTabIds = [
              ...preservedTargetTabIds.slice(0, insertOffset),
              ...sourceTabIds,
              ...preservedTargetTabIds.slice(insertOffset),
            ]
            await this.store.tabGroupStore.groupTabs(
              orderedTabIds,
              targetGroupId,
            )
          }
        } else {
          await moveTabs(sources, windowId, index)
          if (
            hasTabGroupFlow &&
            this.canMutateGroups() &&
            !this.isNoGroupId(sourceGroupId) &&
            wholeGroupSelection &&
            sourceGroupId !== targetGroupId &&
            !options.forceUngroup
          ) {
            await this.store.tabGroupStore.groupTabs(
              sourceTabIds,
              sourceGroupId,
            )
          }
        }
      }
      this.dropped = true
      this.clearSelection()
      this.store.windowStore.markLayoutDirtyIfNeeded('drag-drop')
    } catch (error) {
      log.error('DragStore.drop failed', {
        error,
      })
    } finally {
      await resume({
        repackPolicy: 'never',
        reason: 'drag-drop',
      })
    }
  }

  dropToNewWindow = async () => {
    const { sources } = this.store.tabStore
    this.store.windowStore.createNewWindow(sources)
    this.dropped = true
    this.clearSelection()
  }
}
