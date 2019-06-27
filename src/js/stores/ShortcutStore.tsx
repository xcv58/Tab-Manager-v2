import { MutableRefObject } from 'react'
import { action, observable } from 'mobx'
import Mousetrap from 'mousetrap'
import { openInNewTab } from 'libs'
import Store from 'stores'

export const getDescription = description => {
  if (typeof description === 'string') {
    return description
  }
  if (typeof description === 'function') {
    return description()
  }
  return 'Unknow description'
}

export default class ShortcutStore {
  store: Store
  searchEl: MutableRefObject<HTMLInputElement>

  constructor (store) {
    this.store = store
  }

  @observable
  combo = null
  @observable
  toastOpen = false
  @observable
  dialogOpen = false
  closeHandle = null

  @observable
  inputShortcutSet = new Set([
    'escape',
    'enter',
    'ctrl+enter',
    'ctrl+h',
    'ctrl+l',
    'down',
    'ctrl+j',
    'up',
    'ctrl+k',
    'ctrl+/',
    'ctrl+p',
    'ctrl+s',
    'shift+ctrl+s',
    'ctrl+x',
    'ctrl+r',
    'ctrl+g',
    'ctrl+8',
    'ctrl+m',
    'ctrl+n',
    'ctrl+o',
    'shift+ctrl+g'
  ])

  @observable
  shortcuts = [
    [
      'ctrl+s',
      event => {
        event.preventDefault()
        this.store.arrangeStore.sortTabs()
      },
      'Sort tabs'
    ],
    [
      'shift+ctrl+s',
      event => {
        event.preventDefault()
        this.store.arrangeStore.groupTabs()
      },
      'Group and sort tabs'
    ],
    [
      ['backspace', 'd d'],
      e => {
        this.store.tabStore.remove()
      },
      'Close tab'
    ],
    [
      ['* c', 'ctrl+shift+c'],
      e => {
        e.preventDefault()
        this.store.windowStore.cleanDuplicatedTabs()
      },
      'Clean duplicated tabs'
    ],
    [
      ['enter', 'ctrl+enter'],
      e => {
        this.store.searchStore.enter()
      },
      'Go to tab'
    ],
    [
      ['r', 'ctrl+r'],
      e => {
        this.store.tabStore.reload()
      },
      'Reload tab'
    ],
    [
      ['s'],
      () => {
        this.store.windowStore.syncAllWindows()
      },
      'Sync all windows'
    ],
    [
      ['p', 'ctrl+p'],
      e => {
        e.preventDefault()
        this.store.tabStore.togglePin()
      },
      'Toogle pin'
    ],
    [
      '/',
      event => {
        event.preventDefault()
        this.searchEl.current.focus()
      },
      'Search tab'
    ],
    [
      'escape',
      e => {
        if (this.dialogOpen) {
          e.preventDefault()
          return this.closeDialog()
        }
        const {
          searchStore: { clear, typing, query },
          userStore: { dialogOpen, closeDialog }
        } = this.store
        if (typing) {
          e.preventDefault()
          return this.searchEl.current.blur()
        }
        if (dialogOpen) {
          e.preventDefault()
          return closeDialog()
        }
        if (query) {
          e.preventDefault()
          return clear()
        }
      },
      () => {
        if (this.store.searchStore.typing) {
          return 'Go to tab list'
        }
        if (this.dialogOpen) {
          return 'Escape'
        }
        if (this.store.userStore.dialogOpen) {
          return 'Dismiss settings dialog'
        }
        return 'Clear search text'
      }
    ],
    [
      ['h', 'left', 'ctrl+h'],
      e => {
        e.preventDefault()
        this.store.searchStore.left()
      },
      'Left tab'
    ],
    [
      ['l', 'right', 'ctrl+l'],
      e => {
        e.preventDefault()
        this.store.searchStore.right()
      },
      'Right tab'
    ],
    [
      ['j', 'down', 'ctrl+j'],
      e => {
        e.preventDefault()
        this.store.searchStore.down()
      },
      'Next tab'
    ],
    [
      ['k', 'up', 'ctrl+k'],
      e => {
        e.preventDefault()
        this.store.searchStore.up()
      },
      'Previous tab'
    ],
    [
      ['g g', 'ctrl+g'],
      e => {
        e.preventDefault()
        this.store.searchStore.firstTab()
      },
      'First tab'
    ],
    [
      ['shift+g', 'shift+ctrl+g'],
      e => {
        e.preventDefault()
        this.store.searchStore.lastTab()
      },
      'Last tab'
    ],
    [
      ['x', 'ctrl+x'],
      e => {
        e.preventDefault()
        this.store.searchStore.select()
      },
      'Select tab'
    ],
    [
      ['* m', 'ctrl+m'],
      e => {
        e.preventDefault()
        this.store.searchStore.selectAll()
      },
      'Select all matched tab'
    ],
    [
      ['* u', 'i', 'ctrl+u'],
      e => {
        e.preventDefault()
        this.store.searchStore.invertSelect()
      },
      'Invert select tabs'
    ],
    [
      ['* a', 'ctrl+8'],
      e => {
        e.preventDefault()
        this.store.windowStore.selectAll()
      },
      'Select all tab'
    ],
    [
      ['* n', 'ctrl+n'],
      e => {
        e.preventDefault()
        this.store.tabStore.unselectAll()
      },
      'Unselect all tab'
    ],
    [
      ['ctrl+o'],
      e => {
        e.preventDefault()
        openInNewTab()
      },
      'Open this window in new tab'
    ],
    [
      ['ctrl+i'],
      e => {
        e.preventDefault()
        this.store.userStore.toggleDarkTheme()
      },
      'Toggle dark theme'
    ],
    [
      ['?', 'ctrl+/'],
      e => {
        e.preventDefault()
        this.openDialog()
      },
      'Open keyboard shortcut help'
    ],
    [
      'ctrl+,',
      event => {
        event.preventDefault()
        this.store.userStore.toggleDialog()
      },
      'Toggle Settings'
    ]
  ]

  @action
  stopCallback = (e, element, combo) => {
    if (this.dialogOpen) {
      return combo !== 'escape'
    }
    if (this.inputShortcutSet.has(combo)) {
      return false
    }
    const { tagName, contentEditable } = element
    if (contentEditable === 'true') {
      return true
    }
    return ['INPUT', 'SELECT', 'TEXTAREA'].includes(tagName)
  }

  @action
  didMount = searchEl => {
    this.searchEl = searchEl
    Mousetrap.prototype.stopCallback = this.stopCallback
    this.shortcuts.map(([key, func, description]) =>
      Mousetrap.bind(key, (e, combo) => {
        this.combo = `${combo}: ${getDescription(description)}`
        this.openToast()
        func(e)
      })
    )
  }

  @action
  willUnmount = () => Mousetrap.reset()

  @action
  clearCombo = () => {
    this.combo = null
  }

  @action
  openToast = () => {
    if (!this.store.userStore.showShortcutHint) {
      return
    }
    if (this.closeHandle) {
      clearTimeout(this.closeHandle)
    }
    this.toastOpen = true
    this.closeHandle = setTimeout(this.closeToast, 512)
  }

  @action
  closeToast = () => {
    this.toastOpen = false
  }

  @action
  openDialog = () => {
    this.dialogOpen = true
  }

  @action
  closeDialog = () => {
    this.dialogOpen = false
  }
}
