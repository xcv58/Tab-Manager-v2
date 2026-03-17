import { MutableRefObject } from 'react'
import { action, observable, makeObservable } from 'mobx'
import Store from 'stores'

export type FocusOrigin = 'keyboard' | 'mouse' | 'search' | 'programmatic'

export type FocusRequestOptions = {
  origin?: FocusOrigin
  reveal?: boolean
  moveDomFocus?: boolean
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
      shouldMoveDomFocus: observable,
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

  shouldMoveDomFocus = true

  focusRequestId = 0

  setNodeRef = (nodeRef: MutableRefObject<HTMLDivElement>) => {
    this.nodeRef = nodeRef
  }

  setFocusState = ({
    focused,
    origin = 'programmatic',
    reveal = false,
    moveDomFocus = true,
  }: FocusRequestOptions & { focused: boolean }) => {
    this.isFocused = focused
    if (!focused) {
      this.focusOrigin = 'programmatic'
      this.shouldRevealOnFocus = false
      this.shouldMoveDomFocus = true
      return
    }
    this.focusOrigin = origin
    this.shouldRevealOnFocus = reveal
    this.shouldMoveDomFocus = moveDomFocus
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
