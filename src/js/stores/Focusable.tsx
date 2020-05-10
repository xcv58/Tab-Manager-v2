import { action, computed, observable } from 'mobx'
import Store from 'stores'

export default class Focusable {
  store: Store

  constructor (store) {
    this.store = store
  }

  @observable
  id

  @observable
  nodeRef = null

  @action
  setNodeRef = (nodeRef) => {
    this.nodeRef = nodeRef
  }

  @computed
  get isFocused () {
    return this === this.store.focusStore.focusedItem
  }

  getBoundingClientRect = () => {
    if (this.nodeRef) {
      return this.nodeRef.current.getBoundingClientRect()
    }
  }

  activate: () => void
  select: () => void
  closeWindow: () => void
  toggleSelectAll: () => void
  toggleHide: () => void
}
