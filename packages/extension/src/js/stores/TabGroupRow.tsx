import Focusable from './Focusable'
import Store from 'stores'
import type { FocusRequestOptions } from './Focusable'

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

  activate = (options: FocusRequestOptions = {}) => {
    this.store.tabGroupStore?.toggleCollapsed?.(this.groupId)
    this.store.focusStore.focus(this, options)
  }

  select = (options: FocusRequestOptions = {}) => {
    this.store.tabGroupStore?.toggleSelectGroup?.(this.groupId)
    this.store.focusStore.focus(this, options)
  }

  toggleSelectAll = this.select

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
