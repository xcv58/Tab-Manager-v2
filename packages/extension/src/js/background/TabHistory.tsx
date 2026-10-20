import {
  activateTab,
  setLastFocusedWindowId,
  browser,
  isSelfPopup,
  isSelfPopupTab,
  setSelfPopupActive,
} from 'libs'
import actions from 'libs/actions'
import { isSafari } from 'libs/browserCapabilities'
import log from 'libs/log'

const STORAGE_KEY = 'tabHistory'

type HistoryEntry = {
  tabId: number
  windowId: number
}

export default class TabHistory {
  actionMap: { [key: string]: () => void }

  constructor() {
    const { onActivated, onFocusChanged, onRemoved } = this
    browser.tabs.onActivated.addListener(onActivated)
    if (isSafari) {
      browser.tabs.onCreated.addListener(this.onCreated)
      browser.tabs.onUpdated.addListener(this.onUpdated)
    }
    browser.tabs.onRemoved.addListener(onRemoved)
    browser.windows.onFocusChanged.addListener(onFocusChanged)
    this.actionMap = {
      [actions.lastActiveTab]: this.activateTab,
    }
    this.initialization = this.init()
  }

  tabHistory: HistoryEntry[] = []

  private initialization: Promise<void>

  private activationTail: Promise<unknown> = Promise.resolve()
  private observationTail: Promise<unknown> = Promise.resolve()
  private cycle: {
    entries: HistoryEntry[]
    index: number
    lastTargetId: number | null
    completedAt: number
  } | null = null

  private observe = (operation: () => Promise<void>) => {
    const observation = this.observationTail.then(operation)
    this.observationTail = observation.catch(() => {})
    return observation
  }

  // Safari can omit an activation event when creating an already-active tab.
  private onCreated = (tab) =>
    this.observe(async () => {
      try {
        // Safari's creation payload can precede the tab becoming active.
        const current = await browser.tabs.get(tab.id)
        if (!current.active || isSelfPopupTab(current)) return
        const win = await browser.windows.get(current.windowId, {
          populate: true,
        })
        if (win.focused && !isSelfPopup(win))
          this.add({ tabId: current.id, windowId: current.windowId })
      } catch (error) {
        log.warn('Could not record newly created Safari tab', error)
      }
    })

  private onUpdated = (_id, changes, tab) => {
    // A newly opened foreground tab may gain its URL after onCreated.
    if (tab?.active && (changes.url || changes.status === 'complete'))
      return this.onCreated(tab)
  }

  rememberFocusedTab = () =>
    this.observe(async () => {
      const windows = await browser.windows.getAll({ populate: true })
      const current = windows.find((win) => win.focused)
      if (!current || isSelfPopup(current)) return
      const active = current.tabs?.find((tab) => tab.active)
      if (!active || isSelfPopupTab(active)) return
      this.add({ tabId: active.id, windowId: current.id })
      setLastFocusedWindowId(current.id)
    })

  // Flag to indicate if history has been loaded from storage
  loaded = false

  init = async () => {
    try {
      const data = await browser.storage.local.get({ [STORAGE_KEY]: [] })
      if (this.tabHistory.length === 0) {
        const stored = data[STORAGE_KEY]
        this.tabHistory = Array.isArray(stored)
          ? stored
              .filter(
                (entry) =>
                  entry &&
                  Number.isInteger(entry.tabId) &&
                  Number.isInteger(entry.windowId),
              )
              .map(({ tabId, windowId }) => ({ tabId, windowId }))
          : []
      }
      this.loaded = true
      log.debug('TabHistory loaded from storage:', this.tabHistory)
    } catch (e) {
      log.error('Failed to load TabHistory from storage:', e)
      this.loaded = true
    }
  }

  save = async () => {
    if (!this.loaded) {
      return
    }
    try {
      // Limit history size to prevent storage quota issues (optional, but good practice)
      const MAX_HISTORY = 100
      const historyToSave = this.tabHistory.slice(-MAX_HISTORY)
      await browser.storage.local.set({ [STORAGE_KEY]: historyToSave })
    } catch (e) {
      log.error('Failed to save TabHistory to storage:', e)
    }
  }

  add = ({ tabId, windowId }) => {
    if (!tabId || windowId === -1) {
      return
    }
    this.remove(tabId, false) // pass false to avoid double save
    // Cycling needs IDs only. Keep the live history order/capacity intact while
    // avoiding retained URLs, titles, favicon data and other tab metadata.
    this.tabHistory.push({ tabId, windowId })
    this.save()
  }

  remove = (tabId, shouldSave = true) => {
    const index = this.tabHistory.findIndex((x) => x.tabId === tabId)
    if (index !== -1) {
      this.tabHistory.splice(index, 1)
      if (shouldSave) {
        this.save()
      }
    }
  }

  activateTab = () => {
    // Keep rapid shortcut presses ordered while browser reads/activation await IPC.
    const requestedAt = Date.now()
    const activation = this.activationTail.then(() =>
      this.activateNextTab(requestedAt),
    )
    this.activationTail = activation.catch(() => {})
    return activation
  }

  private activateNextTab = async (requestedAt: number) => {
    await this.initialization
    await this.observationTail
    const windows = await browser.windows.getAll({ populate: true })
    const available = new Map<number, HistoryEntry>()
    for (const win of windows) {
      if (isSelfPopup(win)) continue
      for (const tab of win.tabs || [])
        if (!isSelfPopupTab(tab))
          available.set(tab.id, { tabId: tab.id, windowId: win.id })
    }
    this.tabHistory = this.tabHistory
      .filter((entry) => available.has(entry.tabId))
      .map((entry) => available.get(entry.tabId)!)
    const current = windows.find((win) => win.focused)
    const currentTab = current?.tabs?.find((tab) => tab.active)
    const currentId =
      currentTab && available.has(currentTab.id) ? currentTab.id : null
    let cycle = this.cycle
    if (
      !cycle ||
      requestedAt - cycle.completedAt >= 1000 ||
      currentId !== cycle.lastTargetId
    ) {
      if (currentId != null) this.add(available.get(currentId)!)
      // Browser focus/update events can reorder live history while switching.
      // Keep the burst's order fixed and wrap, rather than clamping at oldest.
      const entries = [...this.tabHistory].reverse()
      cycle = {
        entries,
        index:
          currentId == null
            ? -1
            : entries.findIndex((entry) => entry.tabId === currentId),
        lastTargetId: currentId,
        completedAt: requestedAt,
      }
      this.cycle = cycle
    }
    for (let step = 0; step < cycle.entries.length; step += 1) {
      cycle.index = (cycle.index + 1) % cycle.entries.length
      const entry = cycle.entries[cycle.index]
      if (!available.has(entry.tabId) || entry.tabId === currentId) continue
      cycle.lastTargetId = entry.tabId
      try {
        await activateTab(entry.tabId, true)
        // Give the user a full second after the async switch finishes;
        // queued shortcut presses remain in this cycle while IPC is pending.
        cycle.completedAt = Date.now()
      } catch (error) {
        this.cycle = null
        throw error
      }
      return
    }
  }

  onActivated = (activeInfo) =>
    this.observe(() => this.recordActivated(activeInfo))

  private recordActivated = async ({ tabId, windowId }) => {
    try {
      const tab = await browser.tabs.get(tabId)
      if (isSelfPopupTab(tab)) {
        this.remove(tabId)
        return
      }
      this.add({ tabId, windowId })
    } catch (e) {
      // Tab might not exist anymore.
      log.warn('Failed to get tab info in onActivated:', e)
    }
  }

  onFocusChanged = (windowId) =>
    this.observe(() => this.recordFocusedWindow(windowId))

  private recordFocusedWindow = async (windowId) => {
    log.debug('onFocusChanged:', { windowId })
    if (windowId < 0) {
      return setSelfPopupActive(false)
    }
    try {
      const win = await browser.windows.get(windowId, {
        populate: true,
      })
      const tab = (win?.tabs || []).find((candidate) => candidate.active)
      if (!tab) {
        log.debug('onFocusChanged does nothing since no tab')
        return setSelfPopupActive(false)
      }
      const isPopupWindow = !!win && isSelfPopup(win)
      if (isPopupWindow) {
        log.debug('onFocusChanged ignore self popup window', {
          tab,
          isPopupWindow,
        })
        return setSelfPopupActive(true)
      }
      log.debug('onFocusChanged record the window', {
        windowId,
        tab,
        isPopupWindow,
      })
      if (!isSelfPopupTab(tab)) this.add({ tabId: tab.id, windowId })
      setLastFocusedWindowId(windowId)
    } catch (e) {
      log.warn('Error in onFocusChanged:', e)
    }
  }

  onRemoved = async (tabId) => this.remove(tabId)
}
