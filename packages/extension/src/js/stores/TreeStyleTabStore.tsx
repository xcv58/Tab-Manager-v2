import { action, computed, makeObservable, observable, reaction } from 'mobx'
import debounce from 'lodash.debounce'
import { browser } from 'libs'
import log from 'libs/log'
import Store from 'stores'

// Optional integration with the Tree Style Tab (TST) add-on for Firefox.
// API reference: https://github.com/piroor/treestyletab/wiki/API-for-other-addons
export const TST_ID = 'treestyletab@piro.sakura.ne.jp'

const LISTENING_TYPES = [
  'ready',
  'tree-attached',
  'tree-detached',
  'tree-collapsed-state-changed',
  'permissions-changed',
]

// Notifications that mean the tree shape or collapsed state may have changed.
const REFRESH_TYPES = new Set([
  'tree-attached',
  'tree-detached',
  'tree-collapsed-state-changed',
  'permissions-changed',
])

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

export default class TreeStyleTabStore {
  store: Store

  status: TreeStyleTabStatus = 'disabled'

  treeMap: Map<number, TreeInfo> = new Map()

  listening = false

  constructor(store: Store) {
    makeObservable(this, {
      status: observable,
      treeMap: observable.ref,
      active: computed,
      setStatus: action,
      setTreeMap: action,
    })
    this.store = store

    reaction(
      () =>
        !!this.store.userStore?.loaded &&
        !!this.store.userStore?.useTreeStyleTab,
      (enabled) => {
        if (enabled) {
          void this.connect()
        } else {
          void this.disconnect()
        }
      },
      { fireImmediately: true },
    )

    // Tab structure changes (open/close/move/attach) usually also produce TST
    // notifications, but refreshing on our own snapshot changes keeps the two
    // views in sync when notifications are missed.
    reaction(
      () =>
        this.status === 'connected'
          ? (this.store.windowStore?.windows || [])
              .map((win) => `${win.id}:${win.tabs.map((t) => t.id).join(',')}`)
              .join('|')
          : '',
      (signature) => {
        if (signature) this.scheduleRefresh()
      },
    )
  }

  get active() {
    return this.status === 'connected'
  }

  setStatus = (status: TreeStyleTabStatus) => {
    this.status = status
  }

  setTreeMap = (treeMap: Map<number, TreeInfo>) => {
    const previous = this.treeMap
    this.treeMap = treeMap
    if (this.didVisibilityChange(previous, treeMap)) {
      this.store.windowStore?.repackLayout?.('filter-change')
    }
  }

  getTreeInfo = (tabId: number): TreeInfo | null => {
    if (!this.active) return null
    return this.treeMap.get(tabId) || null
  }

  isHiddenByCollapsedTree = (tabId: number): boolean => {
    if (!this.active) return false
    const info = this.treeMap.get(tabId)
    if (!info) return false
    return info.ancestorIds.some(
      (ancestorId) => this.treeMap.get(ancestorId)?.subtreeCollapsed,
    )
  }

  sendMessage = async <T = unknown,>(message: object): Promise<T> =>
    browser.runtime.sendMessage(TST_ID, message) as Promise<T>

  connect = async () => {
    this.listen()
    this.setStatus('connecting')
    try {
      await this.sendMessage({
        type: 'register-self',
        name: browser.runtime.getManifest().name,
        icons: browser.runtime.getManifest().icons,
        listeningTypes: LISTENING_TYPES,
      })
      if (!this.store.userStore.useTreeStyleTab) return
      this.setStatus('connected')
      await this.refresh()
    } catch (error) {
      log.info('TreeStyleTabStore: Tree Style Tab is not available', {
        error,
      })
      if (this.store.userStore.useTreeStyleTab) {
        this.setStatus('unavailable')
      }
      this.setTreeMap(new Map())
    }
  }

  disconnect = async () => {
    const wasConnected = this.status === 'connected'
    this.scheduleRefresh.cancel()
    this.setStatus('disabled')
    this.setTreeMap(new Map())
    if (wasConnected) {
      try {
        await this.sendMessage({ type: 'unregister-self' })
      } catch (error) {
        log.debug('TreeStyleTabStore: unregister failed', { error })
      }
    }
  }

  listen = () => {
    if (this.listening || !browser.runtime.onMessageExternal) return
    this.listening = true
    browser.runtime.onMessageExternal.addListener(this.onMessageExternal)
  }

  onMessageExternal = (message, sender) => {
    if (sender?.id !== TST_ID || !message || typeof message !== 'object') {
      return
    }
    if (!this.store.userStore.useTreeStyleTab) return
    if (message.type === 'ready') {
      // TST was (re)started: registrations are lost and must be redone.
      void this.connect()
      return
    }
    if (REFRESH_TYPES.has(message.type)) {
      this.scheduleRefresh()
    }
  }

  refresh = async () => {
    if (this.status !== 'connected') return
    const windows = this.store.windowStore?.windows || []
    try {
      const results = await Promise.all(
        windows.map((win) =>
          this.sendMessage<LightTreeItem[]>({
            type: 'get-light-tree',
            window: win.id,
            tabs: '*',
          }).catch((error) => {
            log.debug('TreeStyleTabStore: get-light-tree failed', {
              windowId: win.id,
              error,
            })
            return [] as LightTreeItem[]
          }),
        ),
      )
      if (this.status !== 'connected') return
      const treeMap = new Map<number, TreeInfo>()
      results.forEach((items) => {
        ;(Array.isArray(items) ? items : []).forEach((item) => {
          if (!item || typeof item.id !== 'number') return
          const states = item.states || []
          const ancestors = item.ancestorTabIds || []
          treeMap.set(item.id, {
            indent: Math.max(0, item.indent || ancestors.length || 0),
            parentId: ancestors.length ? ancestors[0] : null,
            hasChildren: !!item.children?.length,
            subtreeCollapsed: states.includes('subtree-collapsed'),
            ancestorIds: ancestors,
          })
        })
      })
      this.setTreeMap(treeMap)
    } catch (error) {
      log.warn('TreeStyleTabStore.refresh failed', { error })
    }
  }

  scheduleRefresh = debounce(() => {
    void this.refresh()
  }, 120)

  toggleTreeCollapsed = async (tabId: number) => {
    if (!this.active) return
    const info = this.treeMap.get(tabId)
    if (!info?.hasChildren) return
    // Optimistic update so the click feels instant; TST will notify us and
    // the follow-up refresh reconciles any difference.
    const collapse = !info.subtreeCollapsed
    const next = new Map(this.treeMap)
    next.set(tabId, { ...info, subtreeCollapsed: collapse })
    this.setTreeMap(next)
    try {
      await this.sendMessage({
        type: collapse ? 'collapse-tree' : 'expand-tree',
        tab: tabId,
      })
    } catch (error) {
      log.warn('TreeStyleTabStore.toggleTreeCollapsed failed', { error })
    }
    this.scheduleRefresh()
  }

  // Makes each child the last child of parentId, in the given order. TST only
  // attaches tabs within one window, so callers move tabs there first.
  attachTabs = async (parentId: number, childIds: number[]) => {
    if (!this.active) return false
    try {
      for (const childId of childIds) {
        await this.sendMessage({
          type: 'attach',
          parent: parentId,
          child: childId,
        })
      }
      // Dropping into a collapsed tab reveals the new children, like TST.
      if (this.treeMap.get(parentId)?.subtreeCollapsed) {
        await this.sendMessage({ type: 'expand-tree', tab: parentId })
      }
      return true
    } catch (error) {
      log.warn('TreeStyleTabStore.attachTabs failed', { error })
      return false
    } finally {
      this.scheduleRefresh()
    }
  }

  didVisibilityChange = (
    previous: Map<number, TreeInfo>,
    next: Map<number, TreeInfo>,
  ) => {
    if (previous.size !== next.size) return true
    for (const [id, info] of next) {
      const before = previous.get(id)
      if (
        !before ||
        before.subtreeCollapsed !== info.subtreeCollapsed ||
        before.ancestorIds.join(',') !== info.ancestorIds.join(',')
      ) {
        return true
      }
    }
    return false
  }
}
