import { makeAutoObservable, runInAction } from 'mobx'
import { getWindowLabel } from 'libs/windowLabel'
import TabGroupRow from './TabGroupRow'
import Mousetrap from 'mousetrap'
import { getCommandPaletteShortcut } from 'libs/commandPaletteShortcut'
import { TOOLBAR_FOCUS_SHORTCUT } from 'libs/toolbarFocusShortcut'
import { isLiteShortcut } from 'libs/litePopup'
import { getMountedTabDetailsSurface } from 'libs/tabTooltip'
import { openInNewTab } from 'libs'
import Store from 'stores'
import debounce from 'lodash.debounce'
import { getTabMoveDestinationHint } from 'libs/tabMovePlan'
import {
  TAB_MOVE_SHORTCUTS,
  TAB_MOVE_LABELS,
  formatTabMoveShortcut,
  isTabMoveShortcut,
  type TabMovePosition,
} from 'libs/tabMoveShortcuts'
import {
  captureDialogFocusTarget,
  restoreDialogFocusTarget,
} from 'libs/dialogFocus'

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

const settingsDialogAllowedCombos = new Set(['escape', '?', 'ctrl+/', 'ctrl+,'])

// Keep text editing and printable shortcut sequences local to the search field.
// Modifier actions use the same commands as the palette, including busy guards.
const selectionPaletteCommandIds: Record<string, string> = {
  'ctrl+r': 'reload-selection',
  'ctrl+p': 'pin-selection',
  'ctrl+u': 'invert-selection',
  'ctrl+n': 'clear-selection',
  'ctrl+m': 'select-all-matching',
  'ctrl+8': 'select-matching',
  'ctrl+s': 'sort-all',
  'shift+ctrl+s': 'cluster-all',
  'shift+ctrl+c': 'clean-duplicates',
  'ctrl+o': 'open-app-tab',
  'ctrl+i': 'theme',
  'ctrl+,': 'settings',
  'ctrl+/': 'help',
}
const selectionPaletteAllowedCombos = new Set([
  ...Object.keys(selectionPaletteCommandIds),
  getCommandPaletteShortcut(),
  'command+shift+p',
  TOOLBAR_FOCUS_SHORTCUT,
])

export type ShortcutHelpAction = {
  label: string
  disabledReason?: string
  danger?: boolean
  run: () => void | Promise<unknown>
}

type ShortcutDefinition = [
  string | string[],
  (event?: Event) => void,
  string | (() => string),
]

export default class ShortcutStore {
  store: Store

  constructor(store: Store) {
    makeAutoObservable(this, {
      dialogFocusTarget: false,
      _closeToast: false,
      _closeMoveHint: false,
    })

    this.store = store
  }

  combo: string = null

  toastOpen = false

  dialogOpen = false
  dialogFocusTarget: HTMLElement | null = null

  inputShortcutSet = new Set([
    'escape',
    getCommandPaletteShortcut(),
    TOOLBAR_FOCUS_SHORTCUT,
    'command+shift+p',
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
    'ctrl+u',
    'ctrl+g',
    'ctrl+8',
    'ctrl+m',
    'ctrl+n',
    'ctrl+o',
    'shift+ctrl+g',
    'alt+shift+g',
    'alt+g',
    'alt+u',
    'alt+shift+u',
  ])

  shortcuts: ShortcutDefinition[] = [
    [
      TOOLBAR_FOCUS_SHORTCUT,
      (event: Event) => {
        preventDefault(event)
        this.store.actionStore.focusToolbar()
      },
      'Focus toolbar',
    ],
    [
      'alt+down',
      (event: Event) => {
        const tab = this.store.focusStore.focusedTab
        if (!tab || !this.store.userStore.showTabTooltip) return
        const surface = getMountedTabDetailsSurface(
          tab.id,
          this.store.focusStore.focusedSurface,
        )
        if (!surface) return
        preventDefault(event)
        this.store.hoverStore.openTooltip(tab.id, true, surface)
      },
      'Open focused tab details',
    ],
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
      'Cluster ungrouped tabs by domain and sort',
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
      () => {
        const duplicatedTabsToRemoveCount =
          this.store.windowStore.getDuplicateTabsToRemoveCount()
        return `Close ${duplicatedTabsToRemoveCount} duplicate ${duplicatedTabsToRemoveCount === 1 ? 'tab' : 'tabs'}`
      },
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
      (event: Event) => {
        preventDefault(event)
        this.store.reload()
      },
      'Reload tab',
    ],
    [
      ['s'],
      () => {
        void this.store.windowStore.syncAllWindows({
          revealActiveTab: true,
          origin: 'keyboard',
        })
      },
      'Sync all windows',
    ],
    [
      ['p', 'ctrl+p'],
      (event: Event) => {
        preventDefault(event)
        this.store.togglePin()
      },
      'Toggle pin',
    ],
    [
      '/',
      (event: Event) => {
        preventDefault(event)
        this.store.searchStore.focus()
      },
      'Search tab',
      true,
    ],
    [
      ['>', 'command+shift+p', getCommandPaletteShortcut()],
      (event: Event) => {
        preventDefault(event)
        this.store.actionStore.openPalette()
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
    ...(
      ['beginning', 'end', 'before', 'after'] as const
    ).map<ShortcutDefinition>((position) => [
      [...TAB_MOVE_SHORTCUTS[position]],
      (event: Event) => {
        preventDefault(event)
        void this.moveSelectedTabs(position)
      },
      TAB_MOVE_LABELS[position],
    ]),
    [
      ['ctrl+g'],
      (event: Event) => {
        preventDefault(event)
        this.store.focusStore.groupTab()
      },
      'Cluster same domain ungrouped tabs to this window',
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
        if (this.store.actionStore.liteMode)
          void this.store.actionStore.openFullView('shortcuts')
        else this.openDialog()
      },
      'Open keyboard shortcut help',
    ],
    [
      'ctrl+,',
      (event: Event) => {
        preventDefault(event)
        if (this.store.actionStore.liteMode)
          void this.store.actionStore.openFullView('settings')
        else this.store.userStore.toggleDialog()
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
    [
      ['alt+shift+g'],
      (event: Event) => {
        preventDefault(event)
        if (!this.store.tabGroupStore?.canMutateGroups?.()) {
          return
        }
        this.store.focusStore.createGroupFromFocusedOrSelectedTabs()
      },
      'Create a new group from selected/focused tabs',
    ],
    [
      ['alt+g'],
      (event: Event) => {
        preventDefault(event)
        if (!this.store.tabGroupStore?.canMutateGroups?.()) {
          return
        }
        this.store.focusStore.toggleFocusedTabGroup()
      },
      'Collapse/expand focused tab group',
    ],
    [
      ['alt+shift+u'],
      (event: Event) => {
        preventDefault(event)
        if (!this.store.tabGroupStore?.canMutateGroups?.()) {
          return
        }
        this.store.focusStore.ungroupFocusedSingleTab()
      },
      'Remove focused tab from its group',
    ],
    [
      ['alt+u'],
      (event: Event) => {
        preventDefault(event)
        if (!this.store.tabGroupStore?.canMutateGroups?.()) {
          return
        }
        this.store.focusStore.ungroupFocusedTab()
      },
      'Ungroup focused tab group',
    ],
  ].filter((x) => x)

  stopCallback = (
    e: Event,
    element: HTMLInputElement,
    combo: string,
    sequence?: string,
  ) => {
    // Details controls keep native text copying and keyboard interaction, but
    // must never invoke the workspace's printable or modifier shortcuts.
    if (element.closest?.('[data-tab-details-panel]')) return true
    if (element.closest?.('[data-selection-palette]'))
      return !selectionPaletteAllowedCombos.has(combo)
    if (this.store.actionStore?.paletteOpen) {
      return true
    }
    if (this.dialogOpen) {
      return combo !== 'escape'
    }
    if (this.store.userStore?.dialogOpen) {
      return !settingsDialogAllowedCombos.has(combo)
    }
    if (this.store.actionStore?.liteMode && !isLiteShortcut(sequence || combo))
      return true
    if (
      isTabMoveShortcut(sequence || combo) &&
      (!element.closest?.('[data-testid^="window-card-"]') ||
        element.closest?.(
          'input:not([type="checkbox"]), textarea, select, [contenteditable]:not([contenteditable="false"]), [role="menu"]',
        ))
    ) {
      return true
    }
    if (this.inputShortcutSet.has(combo)) {
      return false
    }
    if (element.closest?.('[role="menu"]')) {
      return true
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
        this.combo = `${formatTabMoveShortcut(combo)}: ${getDescription(description)}`
        this.openToast()
        if (
          (e.target as HTMLElement)?.closest?.('[data-selection-palette]') &&
          selectionPaletteCommandIds[combo]
        ) {
          preventDefault(e)
          const command = this.store.actionStore
            .getCommands({ includeSteps: false })
            .find((item) => item.id === selectionPaletteCommandIds[combo])
          if (command) void this.store.actionStore.execute(command)
          return
        }
        func(e)
      }),
    )
  }

  pause = this.willUnmount

  helpRunning = false

  get helpContext() {
    const { tabStore, focusStore } = this.store
    const parts: string[] = []
    if (tabStore.selection.size)
      parts.push(String(tabStore.selection.size) + ' selected tabs')
    if (focusStore.focusedTab)
      parts.push('Focused tab: ' + focusStore.focusedTab.title)
    else if (focusStore.focusedItem instanceof TabGroupRow)
      parts.push(
        'Focused group: ' +
          (this.store.tabGroupStore.getTabGroup(focusStore.focusedItem.groupId)
            ?.title || 'Unnamed group'),
      )
    else if (focusStore.focusedWindow)
      parts.push('Focused window: ' + getWindowLabel(focusStore.focusedWindow))
    return parts.join(' · ') || 'No tab or window is focused'
  }

  getHelpAction = (keys: string | string[]): ShortcutHelpAction | null => {
    const primary = Array.isArray(keys) ? keys[0] : keys
    const definition = this.shortcuts.find(
      ([candidate]) =>
        (Array.isArray(candidate) ? candidate[0] : candidate) === primary,
    )
    if (!definition) return null
    const { actionStore, tabStore, focusStore, dragStore } = this.store
    const tab = focusStore.focusedTab
    const item = focusStore.focusedItem
    const selected = tabStore.selection.size
    const ids: Record<string, string> = {
      '/': 'search',
      'ctrl+o': 'open-app-tab',
      'ctrl+s': 'sort-all',
      'shift+ctrl+s': 'cluster-all',
      '* c': 'clean-duplicates',
      s: 'sync',
      'ctrl+i': 'theme',
      'ctrl+,': 'settings',
      '* n': 'clear-selection',
      '* a': 'select-matching',
      '* m': 'select-all-matching',
      '* u': 'invert-selection',
      x: 'select-focused',
      space: 'select-focused',
      'shift+x': 'select-container',
      'alt+d': 'close-window',
      'shift+n': 'new-window-selection',
      'w w': 'collapse-window',
      'w t': 'toggle-all-windows',
      'w c': 'collapse-all',
      'w e': 'expand-all',
      r: selected
        ? 'reload-selection'
        : tab
          ? 'reload-tab'
          : item instanceof TabGroupRow
            ? 'reload-group'
            : 'reload-window',
      p: selected ? 'pin-selection' : tab ? 'pin-tab' : 'pin-scope',
      'd d': selected
        ? 'close-selection'
        : tab
          ? 'close-tab'
          : item instanceof TabGroupRow
            ? 'close-group'
            : 'close-window',
      'c c': selected ? 'copy-selection' : tab ? 'copy-tab' : 'copy-scope',
      'c t': selected
        ? 'copy-titles-urls-selection'
        : tab
          ? 'copy-title-url-tab'
          : 'copy-title-url-scope',
      'c ,': 'copy-comma',
      'alt+down': 'tab-details',
      'ctrl+g': 'bring-same-site',
      'alt+shift+g': 'create-group',
      'alt+g': 'collapse-group',
      'alt+u': 'ungroup-group',
      'alt+shift+u': 'ungroup-tab',
      'alt+x': 'select-container-tabs',
      'alt+c': 'group-containers',
      h: 'navigate-left',
      l: 'navigate-right',
      j: 'navigate-down',
      k: 'navigate-up',
      'g g': 'navigate-first',
      'shift+g': 'navigate-last',
    }
    const position = (['beginning', 'end', 'before', 'after'] as const).find(
      (position) =>
        (TAB_MOVE_SHORTCUTS[position] as readonly string[]).includes(primary),
    )
    const commandId = position ? 'move-' + position : ids[primary]
    const command = commandId
      ? actionStore.commands.find((item) => item.id === commandId)
      : null
    let action: ShortcutHelpAction = command
      ? {
          label: command.label,
          disabledReason: command.disabledReason,
          danger: command.danger,
          run: command.run,
        }
      : {
          label: getDescription(definition[2]),
          disabledReason: commandId
            ? 'Focus an applicable tab, group or window first'
            : undefined,
          run: () => definition[1](),
        }
    if (primary === 'enter')
      action = {
        label: tab
          ? 'Go to tab: ' + tab.title
          : item instanceof TabGroupRow
            ? 'Toggle this group'
            : 'Go to this window',
        disabledReason: !item
          ? 'Focus a tab, group or window first'
          : undefined,
        run: focusStore.enter,
      }
    if (primary === '?')
      action.disabledReason = 'You are already viewing keyboard shortcuts'
    if (primary === 'escape')
      action = { label: 'Close keyboard shortcuts', run: () => {} }
    action.disabledReason =
      this.helpRunning || actionStore.busy
        ? 'An action is already in progress'
        : dragStore.dragging
          ? 'Finish dragging first'
          : action.disabledReason
    return action
  }

  runHelpAction = async (keys: string | string[]) => {
    const action = this.getHelpAction(keys)
    if (!action || action.disabledReason) return
    this.helpRunning = true
    this.closeDialog()
    // Restore workspace focus before actions that open another dialog or palette.
    await new Promise<void>((resolve) =>
      window.requestAnimationFrame(() => resolve()),
    )
    try {
      await action.run()
    } catch {
      this.showMoveHint('Could not complete this action. Please try again.')
    } finally {
      runInAction(() => {
        this.helpRunning = false
      })
    }
  }

  moveSelectedTabs = async (position: TabMovePosition) => {
    const { tabStore, focusStore, dragStore } = this.store
    if (dragStore.pendingWindowEdgeDrop) {
      return
    }
    if (!tabStore.selection.size) {
      this.showMoveHint('Select tabs to move')
      return
    }
    if (position === 'beginning' || position === 'end') {
      const win = focusStore.focusedWindow
      if (!win) {
        this.showMoveHint('Focus a destination window or tab')
        return
      }
      const hint = getTabMoveDestinationHint(win, tabStore.selection.values())
      if (hint) {
        this.showMoveHint(hint)
        return
      }
      await dragStore.moveSelectedTabsToWindowEdge(win.id, position)
      return
    }
    const tab = focusStore.focusedTab
    if (!tab) {
      this.showMoveHint('Focus a destination tab')
      return
    }
    const hint = await dragStore.moveSelectedTabsRelativeToTab(
      tab,
      position === 'before',
    )
    if (hint) {
      this.showMoveHint(hint)
    }
  }

  showMoveHint = (message: string) => {
    this.combo = message
    this.toastOpen = true
    this._closeToast.cancel()
    this._closeMoveHint()
  }

  _closeMoveHint = debounce(() => {
    this.closeToast()
  }, 2500)

  clearCombo = () => {
    this.combo = null
  }

  openToast = () => {
    this._closeMoveHint.cancel()
    if (!this.store.userStore.showShortcutHint) {
      this.closeToast()
      return
    }
    this.toastOpen = true
    this._closeToast()
  }

  _closeToast = debounce(() => {
    this.closeToast()
  }, 500)

  closeToast = () => {
    this.toastOpen = false
  }

  openDialog = () => {
    this.dialogFocusTarget = captureDialogFocusTarget()
    this.dialogOpen = true
  }

  closeDialog = () => {
    this.dialogOpen = false
    restoreDialogFocusTarget(
      this.dialogFocusTarget,
      () => this.store.searchStore?.getSearchInputEl?.() || null,
    )
    this.dialogFocusTarget = null
  }
}
