import { MutableRefObject } from 'react'
import { action, observable, makeObservable } from 'mobx'
import Store from 'stores'

export type FocusOrigin = 'keyboard' | 'mouse' | 'search' | 'programmatic'

export type FocusRequestOptions = {
  origin?: FocusOrigin
  reveal?: boolean
}

export default class Focusable {
  store: Store

  constructor(store: Store) {
    makeObservable(this, {
      id: observable,
      nodeRef: observable,
      isFocused: observable,
      focusOrigin: observable,
      shouldRevealOnFocus: observable,
      focusRequestId: observable,
      setNodeRef: action,
      setFocusState: action,
    })

    this.store = store
  }

  id: number = null

  nodeRef: MutableRefObject<HTMLDivElement> = null

  isFocused = false

  focusOrigin: FocusOrigin = 'programmatic'

  shouldRevealOnFocus = false

  focusRequestId = 0

  setNodeRef = (nodeRef: MutableRefObject<HTMLDivElement>) => {
    this.nodeRef = nodeRef
  }

  setFocusState = ({
    focused,
    origin = 'programmatic',
    reveal = false,
  }: FocusRequestOptions & { focused: boolean }) => {
    this.isFocused = focused
    if (!focused) {
      this.focusOrigin = 'programmatic'
      this.shouldRevealOnFocus = false
      return
    }
    this.focusOrigin = origin
    this.shouldRevealOnFocus = reveal
    this.focusRequestId += 1
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
