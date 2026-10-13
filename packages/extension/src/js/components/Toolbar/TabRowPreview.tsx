import React from 'react'
import { makeAutoObservable } from 'mobx'
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
  normalizeTabTooltipUrlLines,
  type TabTooltipUrlLines,
} from 'libs/tabTooltip'

type PreviewConfig = {
  id: number
  title: string
  url: string
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
  tabTooltipUrlLines?: TabTooltipUrlLines
  showDetailsButton?: boolean
}

class PreviewUserStore {
  fontSize = 14
  highlightDuplicatedTab = false

  uiPreset: UiPreset = 'modern'

  showTabTooltip = false

  tabTooltipUrlLines: TabTooltipUrlLines

  showUrl = true

  showTabIcon = true

  increaseContrast = false

  highlightActiveTabsInAllWindows = false

  constructor(config: PreviewConfig) {
    this.fontSize = config.fontSize ?? 14
    this.highlightDuplicatedTab = !!config.showDuplicateMarker
    this.uiPreset = config.uiPreset ?? 'modern'
    this.showTabTooltip = !!config.showTabTooltip
    this.tabTooltipUrlLines = normalizeTabTooltipUrlLines(
      config.tabTooltipUrlLines,
    )
    this.showUrl = config.showUrl ?? true
    this.showTabIcon = config.showTabIcon ?? true
    this.increaseContrast = !!config.increaseContrast
    this.highlightActiveTabsInAllWindows =
      !!config.highlightActiveTabsInAllWindows
    makeAutoObservable(this, {}, { autoBind: true })
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
    this.active = !!config.active
    this.pinned = !!config.pinned
    this.win = {
      lastFocused: config.lastFocused ?? true,
      tabs: [this, { id: config.id + 1000 }],
      canDrop: false,
    }
    makeAutoObservable(this, { store: false, win: false }, { autoBind: true })
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

  select() {}

  bulkSelect() {}

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
    return false
  }

  get isMatched() {
    return true
  }

  get duplicatedTabCount() {
    return this.store.duplicatedTabCount
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
  duplicatedTabCount: number

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

  tab: PreviewTabModel

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

  constructor(config: PreviewConfig) {
    this.duplicatedTabCount = config.duplicatedTabCount ?? 1
    this.userStore = new PreviewUserStore(config)
    this.focusStore = new PreviewFocusStore()
    this.actionStore = new ActionStore(this as never)
    this.tab = new PreviewTabModel(this, config)
    this.windowStore.windows = [
      { getTabById: (id) => (id === this.tab.id ? this.tab : null) },
    ]
    this.hoverStore = new HoverStore(this as never)
  }
}

const createPreviewStore = (config: PreviewConfig) => new PreviewStore(config)

export default observer(
  (props: { config: PreviewConfig; className?: string; testId?: string }) => {
    const { config, className, testId } = props
    const previewStore = React.useMemo(
      () => createPreviewStore(config),
      [
        config.active,
        config.duplicatedTabCount,
        config.highlightActiveTabsInAllWindows,
        config.id,
        config.fontSize,
        config.increaseContrast,
        config.lastFocused,
        config.pinned,
        config.uiPreset,
        config.showDuplicateMarker,
        config.showTabIcon,
        config.showTabTooltip,
        config.tabTooltipUrlLines,
        config.showUrl,
        config.title,
        config.url,
      ],
    )

    return (
      <div data-testid={testId} className={className}>
        <StoreContext.Provider value={previewStore as never}>
          <TabRow
            tab={previewStore.tab as never}
            disableSequentialFocus
            className="w-full min-w-0"
          />
          {config.showDetailsButton && (
            <button
              type="button"
              disabled={!config.showTabTooltip}
              onClick={() =>
                previewStore.hoverStore.openTooltip(config.id, true)
              }
              className="px-2 py-1 text-xs underline disabled:opacity-50"
            >
              Open example details
            </button>
          )}
        </StoreContext.Provider>
      </div>
    )
  },
)
