import Focusable from './Focusable'
import Store from 'stores'

export default class TabGroupRow extends Focusable {
  groupId: number

  windowId: number

  constructor(
    { groupId, windowId }: { groupId: number; windowId: number },
    store: Store,
  ) {
    super(store)
    this.id = groupId
    this.groupId = groupId
    this.windowId = windowId
  }

  updateWindow = (windowId: number) => {
    this.windowId = windowId
  }

  activate = () => {
    this.store.tabGroupStore?.toggleCollapsed?.(this.groupId)
  }

  select = () => {
    this.store.tabGroupStore?.toggleSelectGroup?.(this.groupId)
  }

  toggleSelectAll = () => {
    this.store.tabGroupStore?.toggleSelectGroup?.(this.groupId)
  }

  closeWindow = () => {
    this.store.windowStore.windows
      .find((win) => win.id === this.windowId)
      ?.closeWindow()
  }

  toggleHide = () => {
    this.store.windowStore.windows
      .find((win) => win.id === this.windowId)
      ?.toggleHide()
  }
}
