import { action, computed, makeObservable, observable, reaction } from 'mobx'
import debounce from 'lodash.debounce'
import { browser } from 'libs'
import log from 'libs/log'
import {
  TREE_STYLE_TAB_PORT,
  TST_ID,
  type TreeConnectionUpdate,
} from 'libs/treeStyleTab'
import type Store from 'stores'

export type TreeStyleTabStatus =
  | 'disabled'
  | 'connecting'
  | 'connected'
  | 'unavailable'

export type TreeInfo = {
  indent: number
  parentId: number | null
  hasChildren: boolean
  subtreeCollapsed: boolean
  ancestorIds: number[]
}

type LightTreeItem = {
  id: number
  indent?: number
  states?: string[]
  children?: LightTreeItem[]
  ancestorTabIds?: number[]
}

const hiddenByTree = (map: Map<number, TreeInfo>, tabId: number): boolean =>
  map.get(tabId)?.ancestorIds.some((id) => map.get(id)?.subtreeCollapsed) ??
  false

const addTree = (map: Map<number, TreeInfo>, items: LightTreeItem[]) => {
  const pending = [...items]
  while (pending.length) {
    const item = pending.pop()
    if (!item || typeof item.id !== 'number' || map.has(item.id)) continue
    const ancestors = item.ancestorTabIds || []
    const children = item.children || []
    map.set(item.id, {
      indent: Math.max(0, item.indent || ancestors.length),
      parentId: ancestors[0] ?? null,
      hasChildren: children.length > 0,
      subtreeCollapsed: !!item.states?.includes('subtree-collapsed'),
      ancestorIds: ancestors,
    })
    for (const child of children) pending.push(child)
  }
}

export default class TreeStyleTabStore {
  status: TreeStyleTabStatus = 'disabled'

  treeMap: Map<number, TreeInfo> = new Map()

  private port: chrome.runtime.Port | null = null

  private healthTimer: ReturnType<typeof setInterval> | null = null

  private refreshVersion = 0

  private connectionVersion = 0

  private pendingCollapses = 0

  private retryRefresh = false

  private collapseQueue = Promise.resolve()

  constructor(private store: Store) {
    makeObservable(this, {
      status: observable,
      treeMap: observable.ref,
      active: computed,
      setStatus: action,
      setTreeMap: action,
    })

    reaction(
      () => !!store.userStore.loaded && !!store.userStore.useTreeStyleTab,
      (enabled) => {
        if (enabled) {
          this.checkConnection()
          this.healthTimer = setInterval(this.recheck, 10_000)
          window.addEventListener('focus', this.recheck)
        } else {
          this.disconnect()
        }
      },
      { fireImmediately: true },
    )

    reaction(
      () =>
        this.active
          ? store.windowStore.windows
              .map(
                (win) => `${win.id}:${win.tabs.map((tab) => tab.id).join(',')}`,
              )
              .join('|')
          : '',
      () => {
        if (this.active) this.scheduleRefresh()
      },
    )
  }

  get active() {
    return this.status === 'connected'
  }

  setStatus = (status: TreeStyleTabStatus) => {
    if (status === this.status) return
    this.status = status
    this.connectionVersion++
    if (status === 'connected') {
      this.scheduleRefresh()
    } else {
      this.refreshVersion++
      this.retryRefresh = false
      this.readAfterChanges.cancel()
      this.setTreeMap(new Map())
    }
  }

  setTreeMap = (treeMap: Map<number, TreeInfo>) => {
    const previous = this.treeMap
    this.treeMap = treeMap
    // Additions and removals use WindowStore's deferred tab-event layout.
    // Repack only when a row already in the workspace is hidden or revealed.
    const { searchStore, userStore, windowStore } = this.store
    const visibilityChanged = windowStore.windows.some((win) =>
      win.tabs.some((tab) => {
        if (hiddenByTree(previous, tab.id) === hiddenByTree(treeMap, tab.id)) {
          return false
        }
        return (
          !tab.removing &&
          !tab.isHiddenByCollapsedGroup &&
          !(searchStore.queryActive && tab.isMatched) &&
          (tab.isMatched || userStore.showUnmatchedTab)
        )
      }),
    )
    if (visibilityChanged) windowStore.repackLayout('filter-change')
  }

  getTreeInfo = (tabId: number): TreeInfo | null =>
    this.active ? (this.treeMap.get(tabId) ?? null) : null

  isHiddenByCollapsedTree = (tabId: number): boolean =>
    this.active && hiddenByTree(this.treeMap, tabId)

  private sendMessage = async <T = unknown,>(message: object): Promise<T> =>
    browser.runtime.sendMessage(TST_ID, message) as Promise<T>

  private checkConnection = () => {
    if (!this.store.userStore.useTreeStyleTab) return
    try {
      if (this.port) {
        this.port.postMessage('check')
        return
      }
      this.setStatus('connecting')
      const port = browser.runtime.connect({ name: TREE_STYLE_TAB_PORT })
      this.port = port
      port.onMessage.addListener((message: TreeConnectionUpdate) => {
        if (this.port !== port) return
        if (message.type === 'status') {
          this.setStatus(message.connected ? 'connected' : 'unavailable')
        } else if (message.type === 'refresh') {
          this.scheduleRefresh()
        }
      })
      port.onDisconnect.addListener(() => {
        if (this.port !== port) return
        this.port = null
        this.setStatus('unavailable')
      })
    } catch (error) {
      this.port?.disconnect()
      this.port = null
      this.setStatus('unavailable')
      log.debug('Tree Style Tab connection unavailable', error)
    }
  }

  private recheck = () => {
    this.checkConnection()
    if (this.retryRefresh) this.scheduleRefresh()
  }

  private disconnect = () => {
    if (this.healthTimer != null) {
      clearInterval(this.healthTimer)
      this.healthTimer = null
      window.removeEventListener('focus', this.recheck)
    }
    const port = this.port
    this.port = null
    port?.disconnect()
    this.setStatus('disabled')
  }

  private refresh = async () => {
    if (!this.active || this.pendingCollapses) return
    const version = ++this.refreshVersion
    const windows = this.store.windowStore.windows.slice()
    const results = await Promise.all(
      windows.map(async (win) => {
        try {
          // A window-only request returns roots. Each root carries its subtree.
          const roots = await this.sendMessage<LightTreeItem[]>({
            type: 'get-light-tree',
            window: win.id,
          })
          return Array.isArray(roots) ? roots : null
        } catch (error) {
          log.debug('Tree Style Tab could not read a window', {
            windowId: win.id,
            error,
          })
          return null
        }
      }),
    )
    if (version !== this.refreshVersion) return

    const treeMap = new Map<number, TreeInfo>()
    results.forEach((roots, index) => {
      if (roots) {
        addTree(treeMap, roots)
      } else {
        // One failed window read does not invalidate the whole connection.
        for (const tab of windows[index].tabs) {
          const previous = this.treeMap.get(tab.id)
          if (previous) treeMap.set(tab.id, previous)
        }
      }
    })
    this.retryRefresh = results.some((roots) => roots == null)
    if (this.retryRefresh) this.checkConnection()
    this.setTreeMap(treeMap)
  }

  private readAfterChanges = debounce(() => {
    void this.refresh()
  }, 120)

  private scheduleRefresh = () => {
    if (!this.active) return
    this.refreshVersion++
    this.readAfterChanges()
  }

  toggleTreeCollapsed = (tabId: number) => {
    const info = this.getTreeInfo(tabId)
    if (!info?.hasChildren) return
    const connection = this.connectionVersion
    const collapse = !info.subtreeCollapsed
    const next = new Map(this.treeMap)
    next.set(tabId, { ...info, subtreeCollapsed: collapse })
    this.refreshVersion++
    this.pendingCollapses++
    this.setTreeMap(next)
    this.collapseQueue = this.collapseQueue
      .then(async () => {
        if (connection !== this.connectionVersion) return
        const changed = await this.sendMessage({
          type: collapse ? 'collapse-tree' : 'expand-tree',
          tab: tabId,
        })
        if (changed !== true) this.checkConnection()
      })
      .catch((error) => {
        log.warn('Tree Style Tab could not change collapse state', error)
        this.checkConnection()
      })
      .finally(() => {
        this.pendingCollapses--
        this.scheduleRefresh()
      })
    return this.collapseQueue
  }

  getBranchIds = async (tabId: number) => {
    if (!this.active) return
    const branch = await this.sendMessage<LightTreeItem>({
      type: 'get-light-tree',
      tab: tabId,
    })
    if (branch?.id !== tabId) return
    const nodes = new Map<number, TreeInfo>()
    addTree(nodes, [branch])
    return [...nodes.keys()]
  }

  attachBranch = async (parentId: number, branchIds: number[]) => {
    if (!this.active) return false
    const [rootId] = branchIds
    try {
      const attached = await this.sendMessage({
        type: 'attach',
        parent: parentId,
        child: rootId,
      })
      if (attached !== true) return false
      // The companion can acknowledge an attach even if it ignores the change.
      const parent = await this.sendMessage<LightTreeItem>({
        type: 'get-light-tree',
        tab: parentId,
      })
      const branch = parent?.children?.find((child) => child.id === rootId)
      if (!branch) return false
      const nodes = new Map<number, TreeInfo>()
      addTree(nodes, [branch])
      if (branchIds.some((id) => !nodes.has(id))) return false

      if (parent.states?.includes('subtree-collapsed')) {
        await this.sendMessage({ type: 'expand-tree', tab: parentId }).catch(
          (error) =>
            log.debug(
              'Tree Style Tab could not reveal the nested branch',
              error,
            ),
        )
      }
      return true
    } catch (error) {
      log.warn('Tree Style Tab could not attach the branch', error)
      this.checkConnection()
      return false
    } finally {
      this.scheduleRefresh()
    }
  }
}
