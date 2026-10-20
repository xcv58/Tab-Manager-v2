import React from 'react'
import { makeAutoObservable, runInAction, observable } from 'mobx'
import { observer } from 'mobx-react-lite'
import { StoreContext } from 'components/hooks/useStore'
import TabRow from 'components/Tab/Tab'
import ActionStore from 'stores/ActionStore'
import HoverStore from 'stores/HoverStore'
import { writeToClipboard } from 'libs'
import type { TabCopyFormat } from 'libs/tabExport'
import settingsPreviewIcon from 'img/chrome/settings.png'
import type { UiPreset } from 'stores/UserStore'
import {
  DEFAULT_TAB_TOOLTIP_TITLE_LINES,
  normalizeTabTooltipTitleLines,
  normalizeTabTooltipUrlLines,
  type TabTooltipTitleLines,
  type TabTooltipUrlLines,
} from 'libs/tabTooltip'

export type PreviewConfig = {
  id: number
  title: string
  url: string
  iconUrl?: string
  fontSize?: number
  duplicatedTabCount?: number
  pinned?: boolean
  active?: boolean
  lastFocused?: boolean
  uiPreset?: UiPreset
  increaseContrast?: boolean
  highlightActiveTabsInAllWindows?: boolean
  showDuplicateMarker?: boolean
  showTabIcon?: boolean
  showUrl?: boolean
  showTabTooltip?: boolean
  tabTooltipTitleLines?: TabTooltipTitleLines
  tabTooltipUrlLines?: TabTooltipUrlLines
  showDetailsButton?: boolean
}

class PreviewUserStore {
  fontSize = 14
  highlightDuplicatedTab = false

  uiPreset: UiPreset = 'modern'

  showTabTooltip = false

  tabTooltipTitleLines: TabTooltipTitleLines = DEFAULT_TAB_TOOLTIP_TITLE_LINES

  tabTooltipUrlLines: TabTooltipUrlLines = 3

  showUrl = true

  showTabIcon = true

  increaseContrast = false

  highlightActiveTabsInAllWindows = false

  constructor(config: PreviewConfig) {
    this.updateConfig(config)
    makeAutoObservable(this, {}, { autoBind: true })
  }

  updateConfig(config: PreviewConfig) {
    this.fontSize = config.fontSize ?? 14
    this.highlightDuplicatedTab = !!config.showDuplicateMarker
    this.uiPreset = config.uiPreset ?? 'modern'
    this.showTabTooltip = !!config.showTabTooltip
    this.tabTooltipTitleLines = normalizeTabTooltipTitleLines(
      config.tabTooltipTitleLines,
    )
    this.tabTooltipUrlLines = normalizeTabTooltipUrlLines(
      config.tabTooltipUrlLines,
    )
    this.showUrl = config.showUrl ?? true
    this.showTabIcon = config.showTabIcon ?? true
    this.increaseContrast = !!config.increaseContrast
    this.highlightActiveTabsInAllWindows =
      !!config.highlightActiveTabsInAllWindows
  }
}

class PreviewFocusStore {
  focusedItem: unknown = null

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
  }

  focus(item: unknown) {
    this.focusedItem = item
  }

  defocus() {
    this.focusedItem = null
  }
}

class PreviewTabModel {
  store: PreviewStore

  id: number

  title: string

  url: string

  iconUrl = settingsPreviewIcon

  active = false

  pinned = false

  removing = false

  duplicatedTabCount: number

  groupId = -1

  cookieStoreId = ''

  win: {
    lastFocused: boolean
    tabs: unknown[]
    canDrop: boolean
  }

  constructor(store: PreviewStore, config: PreviewConfig) {
    this.store = store
    this.id = config.id
    this.title = config.title
    this.url = config.url
    this.iconUrl = config.iconUrl || settingsPreviewIcon
    this.active = !!config.active
    this.pinned = !!config.pinned
    this.duplicatedTabCount = config.duplicatedTabCount ?? 1
    this.win = {
      lastFocused: config.lastFocused ?? true,
      tabs: [],
      canDrop: false,
    }
    makeAutoObservable(
      this,
      { store: false, win: observable.ref },
      { autoBind: true },
    )
  }

  setNodeRef() {}

  setHovered() {}

  hover() {
    this.store.hoverStore.hover(this.id)
  }

  unhover() {
    this.store.hoverStore.unhover()
  }

  focus() {
    this.store.focusStore.focus(this)
  }

  activate() {
    this.focus()
  }

  selected = false

  select() {
    this.selected = !this.selected
    this.focus()
  }

  bulkSelect() {
    this.select()
  }

  remove() {}

  reload() {}

  closeOtherTabs() {}

  togglePin() {}

  closeDuplicatedTab() {}

  selectTabsInSameContainer() {}

  openSameContainerTabs() {}

  get isFocused() {
    return this.store.focusStore.focusedItem === this
  }

  get isHovered() {
    return this.store.hoverStore.hoveredTabId === this.id
  }

  get isSelected() {
    return this.selected
  }

  get isMatched() {
    return true
  }

  get isDuplicated() {
    return this.duplicatedTabCount > 1
  }

  get query() {
    return ''
  }

  get shouldHighlight() {
    return (
      this.isFocused ||
      (this.active &&
        (this.win?.lastFocused ||
          this.store.userStore.highlightActiveTabsInAllWindows))
    )
  }
}

class PreviewStore {
  userStore: PreviewUserStore

  hoverStore: HoverStore

  focusStore: PreviewFocusStore

  actionStore: ActionStore

  shortcutStore = { dialogOpen: false, showMoveHint: () => {} }

  // Preview actions remain isolated from real browser tabs.
  windowStore = {
    createNewWindow: () => {},
    windows: [] as Array<{
      getTabById: (id: number) => PreviewTabModel | null
    }>,
  }

  dragStore = {
    dragging: false,
    pendingWindowEdgeDrop: false,
  }

  tabStore = {
    selection: new Map<number, PreviewTabModel>(),
  }

  searchStore = {
    typing: false,
  }

  tabGroupStore = {
    hasTabGroupsApi: () => false,
    canMutateGroups: () => false,
    isNoGroupId: () => true,
    getTabGroup: () => null,
  }

  tabs: PreviewTabModel[]

  copyTabs = async (tabs: PreviewTabModel[], format: TabCopyFormat) => {
    const text = tabs
      .map((tab) =>
        format === 'title'
          ? tab.title
          : format === 'title-url'
            ? tab.title + '\n' + tab.url
            : tab.url,
      )
      .join('\n')
    await writeToClipboard(text)
  }

  constructor(configs: PreviewConfig[]) {
    this.userStore = new PreviewUserStore(configs[0])
    this.focusStore = new PreviewFocusStore()
    this.actionStore = new ActionStore(this as never)
    this.tabs = configs.map((config) => new PreviewTabModel(this, config))
    this.tabs.forEach((tab) => {
      tab.win = { ...tab.win, tabs: this.tabs }
    })
    this.windowStore.windows = [
      { getTabById: (id) => this.tabs.find((tab) => tab.id === id) || null },
    ]
    this.hoverStore = new HoverStore(this as never)
  }

  updateConfigs(configs: PreviewConfig[]) {
    runInAction(() => {
      this.userStore.updateConfig(configs[0])
      configs.forEach((config) => {
        const tab = this.tabs.find((tab) => tab.id === config.id)
        if (!tab) return
        tab.title = config.title
        tab.url = config.url
        tab.iconUrl = config.iconUrl || settingsPreviewIcon
        tab.active = !!config.active
        tab.pinned = !!config.pinned
        tab.duplicatedTabCount = config.duplicatedTabCount ?? 1
        const lastFocused = config.lastFocused ?? true
        if (tab.win.lastFocused !== lastFocused)
          tab.win = { ...tab.win, lastFocused }
      })
    })
  }
}

function usePreviewStore(configs: PreviewConfig[]) {
  const ids = configs.map((config) => config.id).join(',')
  const previewStore = React.useMemo(() => new PreviewStore(configs), [ids])
  // Keep the same tabs and hover/focus stores as settings change.
  React.useLayoutEffect(() => {
    previewStore.updateConfigs(configs)
  }, [previewStore, configs])
  return previewStore
}

const PreviewRow = observer(function PreviewRow({
  previewStore,
  tab,
  config,
  className,
  testId,
}: {
  previewStore: PreviewStore
  tab: PreviewTabModel
  config: PreviewConfig
  className?: string
  testId?: string
}) {
  return (
    <div
      data-testid={testId}
      className={className}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          previewStore.focusStore.defocus()
      }}
    >
      <TabRow tab={tab as never} preview className="w-full min-w-0" />
      {config.showDetailsButton && (
        <button
          type="button"
          disabled={!config.showTabTooltip}
          onClick={() => previewStore.hoverStore.openTooltip(config.id, true)}
          className="px-2 py-1 text-xs underline disabled:opacity-50"
        >
          Open example details
        </button>
      )}
    </div>
  )
})

// All sample tabs share one tooltip owner and one focus target.
export function TabRowsPreview({ configs }: { configs: PreviewConfig[] }) {
  const previewStore = usePreviewStore(configs)
  return (
    <StoreContext.Provider value={previewStore as never}>
      {configs.map((config, index) => (
        <PreviewRow
          key={config.id}
          config={config}
          previewStore={previewStore}
          tab={previewStore.tabs[index]}
        />
      ))}
    </StoreContext.Provider>
  )
}

export default function TabRowPreview({
  config,
  className,
  testId,
}: {
  config: PreviewConfig
  className?: string
  testId?: string
}) {
  const previewStore = usePreviewStore([config])
  return (
    <StoreContext.Provider value={previewStore as never}>
      <PreviewRow
        config={config}
        className={className}
        testId={testId}
        previewStore={previewStore}
        tab={previewStore.tabs[0]}
      />
    </StoreContext.Provider>
  )
}
