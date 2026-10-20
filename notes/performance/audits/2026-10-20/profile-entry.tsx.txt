import React, { Profiler } from 'react'
import { createRoot } from 'react-dom/client'
import { reaction } from 'mobx'
import App from 'components/App'
import { store } from 'components/hooks/useStore'
import demoBrowser, {
  getDemoState,
} from '../../../extension/src/js/demo/browser'
import '../../../extension/src/css/popup.css'
import '@pigment-css/react/styles.css'

declare const __PROFILE_BUILD__: {
  revision: string
  dependencyVersions: Record<string, string>
}

const metrics = {
  readyMs: 0,
  commits: 0,
  renderMs: 0,
  maxCommitRenderMs: 0,
  searchPaintMs: 0,
  searchWorkspaceMs: 0,
  dragMaxRows: 0,
  dragRenderMs: 0,
  dragMaxCommitRenderMs: 0,
  longTasks: 0,
  longTaskMs: 0,
  maxLongTaskMs: 0,
}
let inputStartedAt = 0
let inputQuery = ''
let retainedReferences: Record<string, number | boolean> | null = null
const rows = () => document.querySelectorAll('[data-testid^="tab-row-"]').length
const panel = document.getElementById('profile-metrics')!
const report = () => {
  const memory = (
    performance as Performance & {
      memory?: { usedJSHeapSize: number }
    }
  ).memory
  const state = getDemoState()
  panel.textContent = JSON.stringify(
    {
      build: __PROFILE_BUILD__,
      ...metrics,
      mountedRows: rows(),
      tabCount: state.tabCount,
      windowCount: state.windowCount,
      selectedTabs: store.tabStore.selection.size,
      dragging: store.dragStore.dragging,
      query: store.searchStore.query,
      effectiveQuery: store.searchStore.effectiveQuery,
      matchedTabs: store.searchStore.rawMatchedTabs.length,
      heapBytes: memory?.usedJSHeapSize ?? null,
      viewport: `${innerWidth}x${innerHeight}`,
      retainedReferences,
    },
    null,
    2,
  )
}
document.addEventListener(
  'input',
  (event) => {
    if (
      !(event.target instanceof HTMLInputElement) ||
      event.target.placeholder !== 'Search tabs or URLs'
    )
      return
    inputStartedAt = performance.now()
    inputQuery = event.target.value.trim()
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (inputStartedAt)
          metrics.searchPaintMs = performance.now() - inputStartedAt
      }),
    )
  },
  true,
)
reaction(
  () => store.searchStore.effectiveQuery,
  (query) => {
    if (inputStartedAt && query === inputQuery) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          metrics.searchWorkspaceMs = performance.now() - inputStartedAt
        }),
      )
    }
  },
)
reaction(
  () => !store.windowStore.initialLoading && store.userStore.loaded,
  (ready) => {
    if (ready && !metrics.readyMs) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          metrics.readyMs = performance.now()
        }),
      )
    }
  },
  { fireImmediately: true },
)
if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
  new PerformanceObserver((list) => {
    list.getEntries().forEach(({ duration }) => {
      metrics.longTasks += 1
      metrics.longTaskMs += duration
      metrics.maxLongTaskMs = Math.max(metrics.maxLongTaskMs, duration)
    })
  }).observe({ type: 'longtask', buffered: true })
}
const measureRender: React.ProfilerOnRenderCallback = (
  _id,
  _phase,
  duration,
) => {
  metrics.commits += 1
  metrics.renderMs += duration
  metrics.maxCommitRenderMs = Math.max(metrics.maxCommitRenderMs, duration)
  if (store.dragStore.dragging) {
    metrics.dragMaxRows = Math.max(metrics.dragMaxRows, rows())
    metrics.dragRenderMs += duration
    metrics.dragMaxCommitRenderMs = Math.max(
      metrics.dragMaxCommitRenderMs,
      duration,
    )
  }
}
document.getElementById('reset-metrics')!.addEventListener('click', () => {
  Object.keys(metrics).forEach((key) => {
    if (key !== 'readyMs') metrics[key as keyof typeof metrics] = 0
  })
  inputStartedAt = 0
  report()
})
// Run the model scan on demand so it does not add O(tabs) work to every frame.
document.getElementById('inspect-references')!.addEventListener('click', () => {
  const currentTabs = new Map(
    store.windowStore.windows.flatMap((win) =>
      win.tabs.map((tab) => [tab.id, tab] as const),
    ),
  )
  const models = new Set([
    ...store.windowStore.windows,
    ...currentTabs.values(),
    ...store.windowStore.windows.flatMap((win) =>
      Array.from(win.groupRowMap.values()),
    ),
    ...store.tabStore.selection.values(),
    ...(store.focusStore.focusedItemRef
      ? [store.focusStore.focusedItemRef]
      : []),
  ])
  const nodes = Array.from(models)
    .map((model) => model.nodeRef?.current)
    .filter(Boolean)
  retainedReferences = {
    detachedNodeRefs: nodes.filter((node) => !node.isConnected).length,
    connectedNodeRefs: nodes.filter((node) => node.isConnected).length,
    groupRowCache: store.windowStore.windows.reduce(
      (count, win) => count + win.groupRowMap.size,
      0,
    ),
    staleSelectedModels: Array.from(store.tabStore.selection).filter(
      ([id, tab]) => currentTabs.get(id) !== tab,
    ).length,
    focusedModelCurrent:
      store.focusStore.focusedItem === store.focusStore.focusedItemRef,
    containerRefConnected:
      !!store.focusStore.containerRef?.current?.isConnected,
  }
  report()
})
document
  .getElementById('external-move')!
  .addEventListener('click', async () => {
    const selected = store.tabStore.sources[0]
    const destination = store.windowStore.windows.find(
      (win) => win.id !== selected?.windowId,
    )
    if (selected && destination)
      await demoBrowser.tabs.move(selected.id, {
        windowId: destination.id,
        index: -1,
      })
    report()
  })
document
  .getElementById('external-close')!
  .addEventListener('click', async () => {
    const selected = store.tabStore.sources[0]
    if (selected) await demoBrowser.tabs.remove(selected.id)
    report()
  })
createRoot(document.getElementById('app-container')!).render(
  <Profiler id="App" onRender={measureRender}>
    <App />
  </Profiler>,
)
const timer = window.setInterval(report, 200)
window.addEventListener('pagehide', () => clearInterval(timer), { once: true })
