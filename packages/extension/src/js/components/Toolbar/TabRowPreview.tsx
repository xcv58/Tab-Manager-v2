import React from 'react'
import { makeAutoObservable } from 'mobx'
import { observer } from 'mobx-react-lite'
import { StoreContext } from 'components/hooks/useStore'
import TabRow from 'components/Tab/Tab'
import settingsPreviewIcon from 'img/chrome/settings.png'

type PreviewConfig = {
  id: number
  title: string
  url: string
  duplicatedTabCount?: number
  pinned?: boolean
  active?: boolean
  showDuplicateMarker?: boolean
  showTabIcon?: boolean
  showUrl?: boolean
  showTabTooltip?: boolean
}

class PreviewUserStore {
  highlightDuplicatedTab = false

  showTabTooltip = false

  showUrl = true

  showTabIcon = true

  constructor(config: PreviewConfig) {
    this.highlightDuplicatedTab = !!config.showDuplicateMarker
    this.showTabTooltip = !!config.showTabTooltip
    this.showUrl = config.showUrl ?? true
    this.showTabIcon = config.showTabIcon ?? true
    makeAutoObservable(this, {}, { autoBind: true })
  }
}

class PreviewHoverStore {
  hoveredTabId: number | null = null

  hovered = false

  userStore: PreviewUserStore

  constructor(userStore: PreviewUserStore) {
    this.userStore = userStore
    makeAutoObservable(this, { userStore: false }, { autoBind: true })
  }

  hover(id: number) {
    this.hoveredTabId = id
    this.hovered = this.userStore.showTabTooltip
  }

  unhover() {
    this.hoveredTabId = null
    this.hovered = false
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
  }

  constructor(store: PreviewStore, config: PreviewConfig) {
    this.store = store
    this.id = config.id
    this.title = config.title
    this.url = config.url
    this.active = !!config.active
    this.pinned = !!config.pinned
    this.win = {
      lastFocused: true,
      tabs: [this, { id: config.id + 1000 }],
    }
    makeAutoObservable(this, { store: false, win: false }, { autoBind: true })
  }

  setNodeRef() {}

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
      this.isHovered || this.isFocused || (this.active && this.win?.lastFocused)
    )
  }
}

class PreviewStore {
  duplicatedTabCount: number

  userStore: PreviewUserStore

  hoverStore: PreviewHoverStore

  focusStore: PreviewFocusStore

  dragStore = {
    dragging: false,
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

  constructor(config: PreviewConfig) {
    this.duplicatedTabCount = config.duplicatedTabCount ?? 1
    this.userStore = new PreviewUserStore(config)
    this.hoverStore = new PreviewHoverStore(this.userStore)
    this.focusStore = new PreviewFocusStore()
    this.tab = new PreviewTabModel(this, config)
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
        config.id,
        config.pinned,
        config.showDuplicateMarker,
        config.showTabIcon,
        config.showTabTooltip,
        config.showUrl,
        config.title,
        config.url,
      ],
    )

    return (
      <div data-testid={testId} className={className}>
        <StoreContext.Provider value={previewStore as never}>
          <TabRow tab={previewStore.tab as never} className="w-full min-w-0" />
        </StoreContext.Provider>
      </div>
    )
  },
)
