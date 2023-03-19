import { makeAutoObservable } from 'mobx'
import Mousetrap from 'mousetrap'
import { openInNewTab } from 'libs'
import Store from 'stores'
import debounce from 'lodash.debounce'

export const getDescription = (description: string | (() => string)) => {
  if (typeof description === 'string') {
    return description
  }
  if (typeof description === 'function') {
    return description()
  }
  return 'Unknow description'
}

const preventDefault = (event: Event) => {
  if (event && event.preventDefault) {
    event.preventDefault()
  }
}

const hasFocusedElement = () => {
  const { activeElement } = document
  return activeElement instanceof HTMLElement && activeElement.tabIndex >= 0
}

export default class ShortcutStore {
  store: Store

  constructor(store: Store) {
    makeAutoObservable(this)

    this.store = store
  }

  combo: string = null

  toastOpen = false

  dialogOpen = false

  inputShortcutSet = new Set([
    'escape',
    'ctrl+enter',
    'ctrl+h',
    'ctrl+l',
    'ctrl+j',
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
    'shift+ctrl+g',
  ])

  shortcuts: any[] = [
    [
      'ctrl+s',
      (event: Event) => {
        preventDefault(event)
        this.store.arrangeStore.sortTabs()
      },
      'Sort tabs',
    ],
    [
      'shift+ctrl+s',
      (event: Event) => {
        preventDefault(event)
        this.store.arrangeStore.groupTabs()
      },
      'Group and sort tabs',
    ],
    [
      ['d d'],
      () => {
        this.store.remove()
      },
      'Close tab',
    ],
    [
      ['* c', 'shift+ctrl+c'],
      (event: Event) => {
        preventDefault(event)
        this.store.windowStore.cleanDuplicatedTabs()
      },
      'Clean duplicated tabs',
    ],
    [
      ['enter', 'ctrl+enter'],
      () => {
        if (!hasFocusedElement()) {
          this.store.focusStore.enter()
        }
      },
      'Go to tab',
      true,
    ],
    [
      ['r', 'ctrl+r'],
      () => {
        this.store.reload()
      },
      'Reload tab',
    ],
    [
      ['s'],
      () => {
        this.store.windowStore.syncAllWindows()
      },
      'Sync all windows',
    ],
    [
      ['p', 'ctrl+p'],
      (event: Event) => {
        preventDefault(event)
        this.store.togglePin()
      },
      'Toogle pin',
    ],
    [
      ['/', 'command+k'],
      (event: Event) => {
        preventDefault(event)
        this.store.searchStore.focus()
      },
      'Search tab',
      true,
    ],
    [
      ['>', 'command+shift+p'],
      (event: Event) => {
        preventDefault(event)
        this.store.searchStore.startCommandSearch()
      },
      'Command Palette',
      true,
    ],
    [
      'escape',
      (event: Event) => {
        if (!event) {
          return
        }
        if (this.dialogOpen) {
          event.preventDefault()
          return this.closeDialog()
        }
        const {
          searchStore: { clear, typing, query },
          userStore: { dialogOpen, closeDialog },
        } = this.store
        if (typing) {
          event.preventDefault()
          this.store.searchStore.blur()
          return
        }
        if (dialogOpen) {
          event.preventDefault()
          return closeDialog()
        }
        if (query) {
          event.preventDefault()
          clear()
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
      },
      true,
    ],
    [
      ['h', 'left', 'ctrl+h'],
      (event: Event) => {
        preventDefault(event)
        this.store.focusStore.left()
      },
      'Left tab',
    ],
    [
      ['l', 'right', 'ctrl+l'],
      (event: Event) => {
        preventDefault(event)
        this.store.focusStore.right()
      },
      'Right tab',
    ],
    [
      ['j', 'down', 'ctrl+j'],
      (event: Event) => {
        preventDefault(event)
        this.store.focusStore.down()
      },
      'Next tab',
    ],
    [
      ['k', 'up', 'ctrl+k'],
      (event: Event) => {
        preventDefault(event)
        this.store.focusStore.up()
      },
      'Previous tab',
    ],
    [
      ['g g'],
      (event: Event) => {
        preventDefault(event)
        this.store.focusStore.firstTab()
      },
      'First tab',
    ],
    [
      ['shift+g', 'shift+ctrl+g'],
      (event: Event) => {
        preventDefault(event)
        this.store.focusStore.lastTab()
      },
      'Last tab',
    ],
    [
      ['ctrl+g'],
      (event: Event) => {
        preventDefault(event)
        this.store.focusStore.groupTab()
      },
      'Group same domain tabs to this window',
    ],
    [
      ['x', 'ctrl+x'],
      (event: Event) => {
        preventDefault(event)
        this.store.focusStore.select()
      },
      'Select tab',
      true,
    ],
    [
      ['space'],
      (event: Event) => {
        if (!hasFocusedElement()) {
          preventDefault(event)
          this.store.focusStore.select()
        }
      },
      'Select tab',
      true,
    ],
    [
      ['shift+x'],
      (event: Event) => {
        preventDefault(event)
        this.store.focusStore.selectWindow()
      },
      'Toggle Select Window',
    ],
    [
      ['alt+d'],
      (event: Event) => {
        preventDefault(event)
        this.store.focusStore.closeWindow()
      },
      'Close window',
    ],
    [
      ['* m', 'ctrl+m'],
      (event: Event) => {
        preventDefault(event)
        this.store.searchStore.selectAll()
      },
      'Select all matched tab',
    ],
    [
      ['* u', 'i', 'ctrl+u'],
      (event: Event) => {
        preventDefault(event)
        this.store.searchStore.invertSelect()
      },
      'Invert select tabs',
    ],
    [
      ['* a', 'ctrl+8'],
      (event: Event) => {
        preventDefault(event)
        this.store.searchStore.toggleSelectAll()
      },
      'Select/Unselect all tab(s)',
    ],
    [
      ['* n', 'ctrl+n'],
      (event: Event) => {
        preventDefault(event)
        this.store.tabStore.unselectAll()
      },
      'Unselect all tab',
    ],
    [
      ['ctrl+o'],
      (event: Event) => {
        preventDefault(event)
        openInNewTab()
      },
      'Open this window in new tab',
    ],
    [
      ['shift+n'],
      (event: Event) => {
        preventDefault(event)
        this.store.dragStore.dropToNewWindow()
      },
      'Open selected tab(s) in a new window',
    ],
    [
      ['ctrl+i'],
      (event: Event) => {
        preventDefault(event)
        this.store.userStore.selectNextTheme()
      },
      'Toggle dark theme',
    ],
    [
      ['?', 'ctrl+/'],
      (event: Event) => {
        preventDefault(event)
        this.openDialog()
      },
      'Open keyboard shortcut help',
    ],
    [
      'ctrl+,',
      (event: Event) => {
        preventDefault(event)
        this.store.userStore.toggleDialog()
      },
      'Toggle Settings',
    ],
    [
      'w w',
      (event: Event) => {
        preventDefault(event)
        this.store.focusStore.toggleHideForFocusedWindow()
      },
      'Toggle collapse/expand for current windows',
    ],
    [
      'w t',
      (event: Event) => {
        preventDefault(event)
        this.store.hiddenWindowStore.toggleHideForAllWindows()
      },
      'Toggle collapse/expand for all windows',
    ],
    [
      'w c',
      (event: Event) => {
        preventDefault(event)
        this.store.hiddenWindowStore.updateHideForAllWindows(true)
      },
      'Collapse all windows',
    ],
    [
      'w e',
      (event: Event) => {
        preventDefault(event)
        this.store.hiddenWindowStore.updateHideForAllWindows(false)
      },
      'Expand all windows',
    ],
    [
      'c c',
      (event: Event) => {
        preventDefault(event)
        this.store.copyTabsInfo()
      },
      'Copy selected/focused tabs URL (separated by new line)',
    ],
    [
      'c t',
      (event: Event) => {
        preventDefault(event)
        this.store.copyTabsInfo({
          includeTitle: true,
        })
      },
      'Copy selected/focused tabs title & URL',
    ],
    [
      'c ,',
      (event: Event) => {
        preventDefault(event)
        this.store.copyTabsInfo({
          delimiter: ', ',
        })
      },
      'Copy selected/focused tabs URL (separated by comma `,`)',
    ],
    process.env.TARGET_BROWSER === 'firefox' && [
      ['alt+x'],
      (event: Event) => {
        preventDefault(event)
        this.store.focusStore.selectTabsInSameContainer()
      },
      'Select/Unselect tabs in the same container',
    ],
    process.env.TARGET_BROWSER === 'firefox' && [
      ['alt+c'],
      (event: Event) => {
        preventDefault(event)
        this.store.containerStore.groupTabsByContainer()
      },
      'Group tabs by container',
    ],
  ].filter((x) => x)

  stopCallback = (e: Event, element: HTMLInputElement, combo: string) => {
    if (this.dialogOpen) {
      return combo !== 'escape'
    }
    if (this.inputShortcutSet.has(combo)) {
      return false
    }
    const { contentEditable, tagName, type } = element
    if (contentEditable === 'true') {
      return true
    }
    if (type === 'checkbox') {
      return false
    }
    return ['INPUT', 'SELECT', 'TEXTAREA'].includes(tagName)
  }

  didMount = () => {
    Mousetrap.prototype.stopCallback = this.stopCallback
    this.resume()
  }

  willUnmount = () => Mousetrap.reset()

  resume = () => {
    this.shortcuts.map(([key, func, description]) =>
      Mousetrap.bind(key, (e, combo) => {
        this.combo = `${combo}: ${getDescription(description)}`
        this.openToast()
        func(e)
      }),
    )
  }

  pause = this.willUnmount

  clearCombo = () => {
    this.combo = null
  }

  openToast = () => {
    if (!this.store.userStore.showShortcutHint) {
      return
    }
    this.toastOpen = true
    this._closeToast()
  }

  _closeToast = debounce(() => {
    this.toastOpen = false
  }, 500)

  openDialog = () => {
    this.dialogOpen = true
  }

  closeDialog = () => {
    this.dialogOpen = false
  }
}
