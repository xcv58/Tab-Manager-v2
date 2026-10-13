import { makeAutoObservable, runInAction } from 'mobx'
import { getWindowLabel } from 'libs/windowLabel'
import TabGroupRow from './TabGroupRow'
import Mousetrap from 'mousetrap'
import { getCommandPaletteShortcut } from 'libs/commandPaletteShortcut'
import { getNoun, openInNewTab } from 'libs'
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
      'alt+down',
      (event: Event) => {
        const tab = this.store.focusStore.focusedTab
        if (!tab || !this.store.userStore.showTabTooltip) return
        preventDefault(event)
        this.store.hoverStore.openTooltip(tab.id, true)
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
        return duplicatedTabsToRemoveCount
          ? `Clean ${duplicatedTabsToRemoveCount} duplicate ${getNoun(
              'tab',
              duplicatedTabsToRemoveCount,
            )}`
          : 'Clean duplicated tabs'
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
      () => {
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
    if (this.store.actionStore?.paletteOpen) {
      return true
    }
    if (this.dialogOpen) {
      return combo !== 'escape'
    }
    if (this.store.userStore?.dialogOpen) {
      return !settingsDialogAllowedCombos.has(combo)
    }
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
    const {
      actionStore,
      tabStore,
      focusStore,
      searchStore,
      windowStore,
      tabGroupStore,
      dragStore,
      userStore,
    } = this.store
    const tab = focusStore.focusedTab
    const win = focusStore.focusedWindow
    const item = focusStore.focusedItem
    const selected = tabStore.selection.size
    const sources = this.store._getFocusedOrSelectedTab()
    const scope = selected
      ? String(selected) + ' selected tabs'
      : tab
        ? tab.title
        : item instanceof TabGroupRow
          ? (tabGroupStore.getTabGroup(item.groupId)?.title ||
              'Unnamed group') +
            ' (' +
            sources.length +
            ' tabs)'
          : win
            ? getWindowLabel(win) + ' (' + sources.length + ' tabs)'
            : 'focused item'
    const scopeReason = sources.length
      ? undefined
      : 'Select tabs or focus a tab, group or window'
    const focusedReason = item
      ? undefined
      : 'Focus a tab, group or window first'
    const tabReason = tab ? undefined : 'Focus a tab first'
    const windowReason = win
      ? undefined
      : 'Focus a window or one of its tabs first'
    const ids: Record<string, string> = {
      'ctrl+s': 'sort-all',
      'shift+ctrl+s': 'cluster-all',
      '* c': 'clean-duplicates',
      s: 'sync',
      'ctrl+i': 'theme',
      'ctrl+,': 'settings',
      '* n': 'clear-selection',
      '* a': 'select-matching',
      'shift+n': 'new-window-selection',
      'w w': 'collapse-window',
      r: selected
        ? 'reload-selection'
        : tab
          ? 'reload-tab'
          : item instanceof TabGroupRow
            ? 'reload-group'
            : 'reload-window',
      p: selected ? 'pin-selection' : 'pin-tab',
      'd d': selected ? 'close-selection' : 'close-tab',
      'c c': selected ? 'copy-selection' : 'copy-tab',
      'c t': selected ? 'copy-titles-urls-selection' : 'copy-title-url-tab',
      'alt+shift+u': 'ungroup-tab',
    }
    const command = ids[primary]
      ? actionStore.commands.find((command) => command.id === ids[primary])
      : null
    let action: ShortcutHelpAction = command
      ? {
          label: command.label,
          disabledReason: command.disabledReason,
          danger: command.danger,
          run: command.run,
        }
      : { label: getDescription(definition[2]), run: () => definition[1]() }
    // Remaining shortcuts use their existing action, with explicit applicability.
    switch (primary) {
      case 'alt+down':
        action = {
          ...action,
          label: 'Open details for ' + (tab?.title || 'focused tab'),
          disabledReason:
            tabReason ||
            (!userStore.showTabTooltip
              ? 'Enable tab tooltips in Settings first'
              : undefined),
        }
        break
      case 'enter':
        action = {
          ...action,
          disabledReason: focusedReason,
          run: focusStore.enter,
        }
        break
      case 'x':
      case 'space':
        action = {
          ...action,
          label: 'Toggle selection for ' + scope,
          disabledReason: focusedReason,
          run: focusStore.select,
        }
        break
      case 'shift+x':
      case 'alt+d':
      case 'w w':
        action = {
          ...action,
          label:
            (primary === 'alt+d'
              ? 'Close window: '
              : primary === 'shift+x'
                ? 'Toggle selection in window: '
                : 'Collapse/expand window: ') +
            (win
              ? getWindowLabel(win) + ' (' + win.tabs.length + ' tabs)'
              : 'none'),
          disabledReason: windowReason,
          danger: primary === 'alt+d',
        }
        break
      case 'r':
      case 'p':
      case 'd d':
      case 'c c':
      case 'c t':
      case 'c ,':
        action = {
          ...action,
          label:
            command?.label || getDescription(definition[2]) + ' · ' + scope,
          disabledReason: command?.disabledReason || scopeReason,
          danger: primary === 'd d',
          run:
            command?.run ||
            (primary === 'c c'
              ? () => this.store.copyTabsInfo()
              : primary === 'c t'
                ? () => this.store.copyTabsInfo({ includeTitle: true })
                : primary === 'c ,'
                  ? () => this.store.copyTabsInfo({ delimiter: ', ' })
                  : primary === 'r'
                    ? this.store.reload
                    : primary === 'p'
                      ? this.store.togglePin
                      : this.store.remove),
        }
        break
      case 'shift+n':
        action.disabledReason =
          command?.disabledReason ||
          (!selected ? 'Select tabs first' : undefined)
        break
      case '* m':
      case '* u':
      case '* a':
        action.disabledReason =
          command?.disabledReason ||
          (!searchStore.matchedTabs.length ? 'No matching tabs' : undefined)
        break
      case '* n':
        action.disabledReason = !selected ? 'Select tabs first' : undefined
        break
      case 'h':
      case 'l':
      case 'j':
      case 'k':
      case 'g g':
      case 'shift+g':
      case 'w t':
      case 'w c':
      case 'w e':
        action.disabledReason = !windowStore.windows.length
          ? 'No windows to navigate'
          : undefined
        break
      case 'ctrl+g':
      case 'alt+x':
        action.disabledReason = tabReason
        break
      case 'alt+c':
        action.disabledReason = !windowStore.windows.length
          ? 'No tabs to organize'
          : undefined
        break
      case 'alt+shift+g':
        action.disabledReason = !tabGroupStore?.canMutateGroups?.()
          ? 'Tab groups are unavailable in this browser'
          : scopeReason
        break
      case 'alt+g':
      case 'alt+u':
      case 'alt+shift+u':
        action.disabledReason = !tabGroupStore?.canMutateGroups?.()
          ? 'Tab groups are unavailable in this browser'
          : primary === 'alt+shift+u' && !tab
            ? tabReason
            : !tabGroupStore.getTabGroup(
                  item instanceof TabGroupRow ? item.groupId : tab?.groupId,
                )
              ? 'Focus a grouped tab or a group first'
              : undefined
        break
      case '?':
        action.disabledReason = 'You are already viewing keyboard shortcuts'
        break
      case 'escape':
        action = { label: 'Close keyboard shortcuts', run: () => {} }
        break
    }
    const position = (['beginning', 'end', 'before', 'after'] as const).find(
      (position) =>
        (TAB_MOVE_SHORTCUTS[position] as readonly string[]).includes(primary),
    )
    if (position) {
      action = {
        label: TAB_MOVE_LABELS[position] + ' · ' + scope,
        disabledReason: dragStore.pendingWindowEdgeDrop
          ? 'A tab move is already in progress'
          : !selected
            ? 'Select tabs first'
            : position === 'beginning' || position === 'end'
              ? windowReason ||
                getTabMoveDestinationHint(win, tabStore.selection.values()) ||
                undefined
              : tabReason,
        run: () => this.moveSelectedTabs(position),
      }
    }
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
    restoreDialogFocusTarget(this.dialogFocusTarget)
    this.dialogFocusTarget = null
  }
}
