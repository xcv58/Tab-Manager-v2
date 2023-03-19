import { MutableRefObject } from 'react'
import { makeAutoObservable } from 'mobx'
import Store from 'stores'

export default class Focusable {
  store: Store

  constructor(store: Store) {
    makeAutoObservable(this)

    this.store = store
  }

  id: number = null

  nodeRef: MutableRefObject<HTMLDivElement> = null

  setNodeRef = (nodeRef: MutableRefObject<HTMLDivElement>) => {
    this.nodeRef = nodeRef
  }

  get isFocused() {
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
