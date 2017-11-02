import { action, observable } from 'mobx'
import Mousetrap from 'mousetrap'

export default class ShortcutStore {
  constructor (store) {
    this.store = store
  }

  @observable combo = null
  @observable toastOpen = false
  @observable dialogOpen = false
  closeHandle = null

  @observable inputShortcutSet = new Set([
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
    'ctrl+d',
    'ctrl+g',
    'ctrl+8',
    'ctrl+m',
    'ctrl+n',
    'ctrl+o',
    'shift+ctrl+g'
  ])

  @observable shortcuts = [
    [ 'ctrl+s', (event) => {
      event.preventDefault()
      this.store.arrangeStore.sortTabs()
    }, 'Sort tabs' ],
    [ 'shift+ctrl+s', (event) => {
      event.preventDefault()
      this.store.arrangeStore.groupTabs()
    }, 'Group and sort tabs' ],
    [ [ 'backspace', 'ctrl+d' ], (e) => {
      this.store.tabStore.remove()
    }, 'Close tab' ],
    [ [ 'enter', 'ctrl+enter' ], (e) => {
      this.store.searchStore.enter()
    }, 'Go to tab' ],
    [ [ 'p', 'ctrl+p' ], (e) => {
      e.preventDefault()
      this.store.tabStore.togglePin()
    }, 'Toogle pin' ],
    [ '/', (event) => {
      event.preventDefault()
      this.App.search.focus()
    }, 'Search tab' ],
    [ 'escape', (e) => {
      const { searchStore: { typing } } = this.store
      if (typing) {
        e.preventDefault()
        this.App.search.blur()
      }
      if (this.dialogOpen) {
        e.preventDefault()
        this.closeDialog()
      }
    }, 'Go to tab list' ],
    [ [ 'h', 'left', 'ctrl+h' ], (e) => {
      e.preventDefault()
      this.store.searchStore.left()
    }, 'Left tab' ],
    [ [ 'l', 'right', 'ctrl+l' ], (e) => {
      e.preventDefault()
      this.store.searchStore.right()
    }, 'Right tab' ],
    [ [ 'j', 'down', 'ctrl+j' ], (e) => {
      e.preventDefault()
      this.store.searchStore.down()
    }, 'Next tab' ],
    [ [ 'k', 'up', 'ctrl+k' ], (e) => {
      e.preventDefault()
      this.store.searchStore.up()
    }, 'Previous tab' ],
    [ [ 'g g', 'ctrl+g' ], (e) => {
      e.preventDefault()
      this.store.searchStore.firstTab()
    }, 'First tab' ],
    [ [ 'shift+g', 'shift+ctrl+g' ], (e) => {
      e.preventDefault()
      this.store.searchStore.lastTab()
    }, 'Last tab' ],
    [ [ 'x', 'ctrl+x' ], (e) => {
      e.preventDefault()
      this.store.searchStore.select()
    }, 'Select tab' ],
    [ [ '* m', 'ctrl+m' ], (e) => {
      e.preventDefault()
      this.store.searchStore.selectAll()
    }, 'Select all matched tab' ],
    [ [ '* a', 'ctrl+8' ], (e) => {
      e.preventDefault()
      this.store.windowStore.selectAll()
    }, 'Select all tab' ],
    [ [ '* n', 'ctrl+n' ], (e) => {
      e.preventDefault()
      this.store.tabStore.unselectAll()
    }, 'Unselect all tab' ],
    [ [ 'ctrl+o' ], (e) => {
      e.preventDefault()
      const url = chrome.runtime.getURL('popup.html')
      chrome.tabs.create({ url })
    }, 'Open this window in new tab' ],
    [ [ '?', 'ctrl+/' ], (e) => {
      e.preventDefault()
      this.openDialog()
    }, 'Open keyboard shortcut help' ]
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
    return [ 'INPUT', 'SELECT', 'TEXTAREA' ].includes(tagName)
  }

  @action
  didMount = (App) => {
    this.App = App
    Mousetrap.prototype.stopCallback = this.stopCallback
    this.shortcuts.map(
      ([ key, func, description ]) => Mousetrap.bind(key, (e, combo) => {
        this.combo = `${combo}: ${description}`
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
