import { makeAutoObservable, observable, runInAction } from 'mobx'
import type Store from 'stores'
import type Focusable from './Focusable'
import type Tab from './Tab'
import { getNoun, writeToClipboard } from 'libs'
import { getTabMoveDestinationHint } from 'libs/tabMovePlan'
import { restoreDialogFocusTarget } from 'libs/dialogFocus'
import TabGroupRow from './TabGroupRow'

export type ActionMenuAnchor = {
  key: string
  element: HTMLElement
  position?: { top: number; left: number }
}

export type PaletteIconName =
  | 'reload'
  | 'copy'
  | 'move'
  | 'new-window'
  | 'window'
  | 'group'
  | 'pin'
  | 'close'
  | 'ungroup'
  | 'expand'
  | 'collapse'
  | 'sort'
  | 'select'
  | 'deselect'
  | 'clean-duplicates'
  | 'cluster'
  | 'sync'
  | 'settings'
  | 'keyboard'
  | 'theme'

export type PaletteCommand = {
  id: string
  icon: PaletteIconName
  label: string
  section: string
  detail?: string
  groupColor?: string
  aliases?: string
  shortcut?: string
  disabledReason?: string
  danger?: boolean
  keepOpen?: boolean
  run: () => void | Promise<unknown>
}

class PaletteMoveError extends Error {}

/** App-local overlays. These shortcuts never enter the browser manifest. */
export default class ActionStore {
  store: Store
  menu: ActionMenuAnchor | null = null
  menuAnchors = new Map<string, ActionMenuAnchor>()
  paletteOpen = false
  query = ''
  choosingDestination = false
  busy = false
  error = ''
  paletteFocusTarget: HTMLElement | null = null

  constructor(store: Store) {
    this.store = store
    makeAutoObservable(this, {
      store: false,
      menu: observable.ref,
      menuAnchors: observable.shallow,
      paletteFocusTarget: false,
    })
  }

  openMenu = (anchor: ActionMenuAnchor, target?: Focusable) => {
    if (this.store.dragStore.dragging || this.busy) return
    this.closePalette(false)
    this.closeMenu()
    this.store.hoverStore.hideTooltip()
    if (target) {
      this.store.focusStore.focus(target, {
        origin: 'mouse',
        reveal: false,
        moveDomFocus: false,
      })
    }
    this.menu = anchor
    this.menuAnchors.set(anchor.key, anchor)
  }

  closeMenu = () => {
    if (this.menu) this.menuAnchors.delete(this.menu.key)
    this.menu = null
  }

  openPalette = (query = '') => {
    if (
      this.store.dragStore.dragging ||
      this.store.userStore.dialogOpen ||
      this.store.shortcutStore.dialogOpen
    )
      return
    if (!this.paletteOpen) {
      this.paletteFocusTarget =
        this.menu?.element ||
        (document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null)
    }
    this.closeMenu()
    this.store.hoverStore.hideTooltip()
    this.query = query
    this.choosingDestination = false
    this.error = ''
    this.paletteOpen = true
  }

  closePalette = (restoreFocus = true) => {
    if (this.busy) return
    const wasOpen = this.paletteOpen
    this.paletteOpen = false
    this.choosingDestination = false
    if (
      wasOpen &&
      restoreFocus &&
      !this.store.userStore.dialogOpen &&
      !this.store.shortcutStore.dialogOpen
    ) {
      restoreDialogFocusTarget(
        this.paletteFocusTarget?.isConnected
          ? this.paletteFocusTarget
          : this.store.focusStore.focusedItem?.nodeRef?.current,
      )
    }
  }

  setQuery = (query: string) => {
    this.query = query
  }

  back = () => {
    this.choosingDestination = false
    this.query = ''
    this.error = ''
  }

  copyTabUrl = async (tab: Tab) => {
    await writeToClipboard(tab.url)
    this.store.shortcutStore.showMoveHint('Tab URL copied')
  }

  moveTabToNewWindow = (tab: Tab) =>
    this.store.windowStore.createNewWindow([tab])

  execute = async (command: PaletteCommand) => {
    if (this.busy || command.disabledReason) return
    this.error = ''
    this.busy = true
    try {
      await command.run()
      runInAction(() => {
        this.busy = false
        if (!command.keepOpen) this.closePalette()
      })
    } catch (error) {
      runInAction(() => {
        this.busy = false
        this.error =
          error instanceof PaletteMoveError
            ? error.message
            : 'Could not complete this action. Please try again.'
      })
    }
  }

  get commands(): PaletteCommand[] {
    const {
      tabStore,
      focusStore,
      windowStore,
      dragStore,
      arrangeStore,
      searchStore,
      userStore,
      shortcutStore,
      tabGroupStore,
    } = this.store
    const count = tabStore.selection.size
    const selectedScope = `${count} selected ${getNoun('tab', count)}`
    const selectionReason = !count ? 'Select tabs first' : undefined
    const moveReason = dragStore.pendingWindowEdgeDrop
      ? 'A tab move is already in progress'
      : selectionReason
    if (this.choosingDestination) {
      const windowTitle = (win: (typeof windowStore.windows)[number]) =>
        win.tabs.find((tab) => tab.active)?.title ||
        win.tabs[0]?.title ||
        'Empty window'
      const windows = new Map(windowStore.windows.map((win) => [win.id, win]))
      // Group metadata includes collapsed groups whose tab rows are hidden.
      const groups: PaletteCommand[] = Array.from(
        tabGroupStore.tabGroupMap.values(),
      )
        .filter((group) => windows.has(group.windowId))
        .map((group) => {
          const parent = windows.get(group.windowId)!
          const tabs = tabGroupStore.getTabsForGroup(group.id)
          const parentTitle = windowTitle(parent)
          return {
            id: `move-group-${group.id}`,
            icon: 'group',
            groupColor: group.color,
            label: group.title || 'Unnamed group',
            detail: `${parentTitle} · ${tabs.length} ${getNoun('tab', tabs.length)}${group.collapsed ? ' · Collapsed' : ''}`,
            section: 'Groups · Add to group',
            aliases: `${parentTitle} ${group.color}${group.collapsed ? ' collapsed' : ''}`,
            disabledReason: moveReason || dragStore.getGroupMoveHint(group.id),
            run: async () => {
              const hint = await dragStore.moveSelectedTabsToGroup(group.id)
              if (hint) throw new PaletteMoveError(hint)
            },
          }
        })
      const windowCommands: PaletteCommand[] = windowStore.windows.map(
        (win) => ({
          id: `move-window-${win.id}`,
          icon: 'window',
          label: windowTitle(win),
          detail: `${win.tabs.length} ${getNoun('tab', win.tabs.length)}${focusStore.focusedWindow?.id === win.id ? ' · Current window' : ''}`,
          section: 'Windows · Move to end',
          aliases: win.tabs
            .slice(0, 3)
            .map((tab) => tab.url)
            .join(' '),
          disabledReason:
            moveReason ||
            getTabMoveDestinationHint(win, tabStore.selection.values()) ||
            undefined,
          run: async () => {
            const hint = await dragStore.moveSelectedTabsToWindowEdge(
              win.id,
              'end',
            )
            if (hint) throw new PaletteMoveError(hint)
          },
        }),
      )
      return [...groups, ...windowCommands]
    }
    const tab = focusStore.focusedTab
    const win = focusStore.focusedWindow
    const focusedItem = focusStore.focusedItem
    const duplicateCount = windowStore.getDuplicateTabsToRemoveCount()
    const commands: PaletteCommand[] = []
    if (count) {
      commands.push(
        {
          id: 'reload-selection',
          icon: 'reload',
          label: `Reload ${selectedScope}`,
          section: 'Selected tabs',
          aliases: 'refresh',
          shortcut: 'Ctrl R',
          run: this.store.reload,
        },
        {
          id: 'copy-selection',
          icon: 'copy',
          label: `Copy URLs of ${selectedScope}`,
          section: 'Selected tabs',
          aliases: 'clipboard links',
          shortcut: 'c → c',
          run: () => this.store.copyTabsInfo(),
        },
        {
          id: 'new-window-selection',
          icon: 'new-window',
          label: `Move ${selectedScope} to a new window`,
          section: 'Selected tabs',
          shortcut: 'Shift N',
          disabledReason: moveReason,
          run: dragStore.dropToNewWindow,
        },
        {
          id: 'pin-selection',
          icon: 'pin',
          label: `Toggle pin for ${selectedScope}`,
          section: 'Selected tabs',
          shortcut: 'Ctrl P',
          run: this.store.togglePin,
        },
        {
          id: 'close-selection',
          icon: 'close',
          label: `Close ${selectedScope}`,
          section: 'Selected tabs',
          danger: true,
          shortcut: 'd → d',
          run: this.store.remove,
        },
      )
    }
    commands.push({
      id: 'move-selection',
      icon: 'move',
      label: count ? `Move ${selectedScope} to…` : 'Move selected tabs to…',
      section: count ? 'Selected tabs' : 'Selection',
      disabledReason: moveReason,
      keepOpen: true,
      aliases: 'window group destination send',
      run: () => {
        this.choosingDestination = true
        this.query = ''
      },
    })
    if (tab) {
      commands.push(
        {
          id: 'reload-tab',
          icon: 'reload',
          label: 'Reload this tab',
          section: 'Focused tab',
          aliases: 'refresh',
          run: tab.reload,
        },
        {
          id: 'copy-tab',
          icon: 'copy',
          label: 'Copy this tab’s URL',
          section: 'Focused tab',
          aliases: 'clipboard link',
          run: () => this.copyTabUrl(tab),
        },
        {
          id: 'new-window-tab',
          icon: 'new-window',
          label: 'Move this tab to a new window',
          section: 'Focused tab',
          disabledReason: dragStore.pendingWindowEdgeDrop
            ? 'A tab move is already in progress'
            : undefined,
          run: () => this.moveTabToNewWindow(tab),
        },
        {
          id: 'pin-tab',
          icon: 'pin',
          label: tab.pinned ? 'Unpin this tab' : 'Pin this tab',
          section: 'Focused tab',
          run: tab.togglePin,
        },
        {
          id: 'close-tab',
          icon: 'close',
          label: 'Close this tab',
          section: 'Focused tab',
          danger: true,
          run: tab.remove,
        },
      )
      if (
        tabGroupStore?.canMutateGroups?.() &&
        !tabGroupStore.isNoGroupId(tab.groupId)
      ) {
        commands.push({
          id: 'ungroup-tab',
          icon: 'ungroup',
          label: 'Remove this tab from its group',
          section: 'Focused tab',
          aliases: 'ungroup',
          run: () => tabGroupStore.ungroupTab(tab.id),
        })
      }
    }
    if (focusedItem instanceof TabGroupRow) {
      const group = tabGroupStore?.getTabGroup(focusedItem.groupId)
      const groupTabs: Tab[] =
        tabGroupStore?.getTabsForGroup(focusedItem.groupId) || []
      commands.push({
        id: 'reload-group',
        icon: 'reload',
        label: `Reload ${groupTabs.length} tabs in this group`,
        section: 'Focused group',
        aliases: 'refresh',
        run: () => Promise.all(groupTabs.map((tab) => tab.reload())),
      })
      if (tabGroupStore?.canMutateGroups?.()) {
        commands.push(
          {
            id: 'collapse-group',
            icon: group?.collapsed ? 'expand' : 'collapse',
            label: `${group?.collapsed ? 'Expand' : 'Collapse'} this group`,
            section: 'Focused group',
            run: () => tabGroupStore.toggleCollapsed(focusedItem.groupId),
          },
          {
            id: 'ungroup-group',
            icon: 'ungroup',
            label: 'Ungroup tabs in this group',
            section: 'Focused group',
            run: () => tabGroupStore.ungroup(focusedItem.groupId),
          },
        )
      }
    }
    if (win) {
      commands.push(
        {
          id: 'sort-window',
          icon: 'sort',
          label: `Sort ${win.tabs.length} tabs in this window`,
          section: 'Focused window',
          disabledReason: win.hide ? 'Expand this window first' : undefined,
          run: () => arrangeStore.sortTabs(win.id),
        },
        {
          id: 'reload-window',
          icon: 'reload',
          label: `Reload ${win.tabs.length} tabs in this window`,
          section: 'Focused window',
          disabledReason: win.hide ? 'Expand this window first' : undefined,
          aliases: 'refresh',
          run: win.reload,
        },
        {
          id: 'collapse-window',
          icon: win.hide ? 'expand' : 'collapse',
          label: `${win.hide ? 'Expand' : 'Collapse'} this window`,
          section: 'Focused window',
          run: win.toggleHide,
        },
      )
    }
    commands.push(
      {
        id: 'select-matching',
        icon: searchStore.allTabSelected ? 'deselect' : 'select',
        label: `${searchStore.allTabSelected ? 'Deselect' : 'Select'} all ${searchStore.matchedTabs.length} ${searchStore.queryActive ? 'matching ' : ''}tabs`,
        section: 'Selection',
        run: () => searchStore.toggleSelectAll(),
      },
      {
        id: 'clear-selection',
        icon: 'deselect',
        label: 'Clear selection',
        section: 'Selection',
        disabledReason: selectionReason,
        run: tabStore.unselectAll,
      },
      {
        id: 'clean-duplicates',
        icon: 'clean-duplicates',
        label: `Close ${duplicateCount} duplicate ${getNoun('tab', duplicateCount)}`,
        section: 'Across windows',
        aliases: 'clean duplicates deduplicate',
        danger: true,
        disabledReason: !duplicateCount ? 'No duplicate tabs' : undefined,
        shortcut: 'Ctrl Shift C',
        run: () => windowStore.cleanDuplicatedTabs(),
      },
      {
        id: 'sort-all',
        icon: 'sort',
        label: 'Sort tabs across windows',
        section: 'Across windows',
        shortcut: 'Ctrl S',
        run: () => arrangeStore.sortTabs(),
      },
      {
        id: 'cluster-all',
        icon: 'cluster',
        label: 'Cluster ungrouped tabs by site and sort',
        section: 'Across windows',
        aliases: 'domain organize',
        shortcut: 'Ctrl Shift S',
        run: () => arrangeStore.groupTabs(),
      },
      {
        id: 'sync',
        icon: 'sync',
        label: 'Sync all windows',
        section: 'Application',
        shortcut: 's',
        run: () => windowStore.syncAllWindows(),
      },
      {
        id: 'settings',
        icon: 'settings',
        label: 'Open Settings',
        section: 'Application',
        aliases: 'preferences appearance',
        shortcut: 'Ctrl ,',
        run: userStore.openDialog,
      },
      {
        id: 'help',
        icon: 'keyboard',
        label: 'Show keyboard shortcuts',
        section: 'Application',
        aliases: 'help hotkeys',
        shortcut: '?',
        run: shortcutStore.openDialog,
      },
      {
        id: 'theme',
        icon: 'theme',
        label: 'Toggle dark theme',
        section: 'Application',
        aliases: 'light appearance',
        shortcut: 'Ctrl I',
        run: userStore.selectNextTheme,
      },
    )
    return commands
  }
}
