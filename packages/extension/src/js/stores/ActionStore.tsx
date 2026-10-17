import { makeAutoObservable, observable, reaction, runInAction } from 'mobx'
import type Store from 'stores'
import type Focusable from './Focusable'
import type Tab from './Tab'
import {
  browser,
  getNoun,
  openFullTabManager,
  openInNewTab,
  openOrTogglePopup,
} from 'libs'
import { isLitePopupMode } from 'libs/litePopup'
import type { TabFileFormat } from 'libs/tabExport'
import { getTabMoveDestinationHint } from 'libs/tabMovePlan'
import { restoreDialogFocusTarget } from 'libs/dialogFocus'
import TabGroupRow from './TabGroupRow'
import { getWindowLabel } from 'libs/windowLabel'
import { getMountedTabDetailsSurface } from 'libs/tabTooltip'
import { TOOLBAR_FOCUS_SHORTCUT_LABEL } from 'libs/toolbarFocusShortcut'

export type ActionMenuAnchor = {
  key: string
  element: HTMLElement
  position?: { top: number; left: number }
}

export type PaletteIconName =
  | 'search'
  | 'tab'
  | 'details'
  | 'close-others'
  | 'close-window'
  | 'edit'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'invert'
  | 'reload'
  | 'copy'
  | 'url'
  | 'title'
  | 'title-url'
  | 'csv'
  | 'tsv'
  | 'json'
  | 'markdown'
  | 'export'
  | 'move'
  | 'new-window'
  | 'window'
  | 'group'
  | 'pin'
  | 'unpin'
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
  afterClose?: boolean
  keepOpen?: boolean
  moveTarget?: PaletteMoveTarget
  run: () => void | Promise<unknown>
}

type PaletteMoveTarget =
  | { kind: 'window'; id: number; edge: 'beginning' | 'end' }
  | { kind: 'group'; id: number }
  | { kind: 'tab'; id: number; before: boolean }

class PaletteMoveError extends Error {}

const copyFormats: Array<{
  format: TabFileFormat
  icon: PaletteIconName
  label: string
  detail: string
  aliases: string
}> = [
  {
    format: 'csv',
    icon: 'csv',
    label: 'CSV',
    detail: 'Table with titles, URLs, windows, groups and pinned state',
    aliases: 'comma separated values table',
  },
  {
    format: 'tsv',
    icon: 'tsv',
    label: 'spreadsheets (TSV)',
    detail: 'Tab-separated table for spreadsheet columns',
    aliases: 'tab separated values excel sheets table',
  },
  {
    format: 'json',
    icon: 'json',
    label: 'JSON',
    detail: 'Structured windows, tabs and group metadata',
    aliases: 'structured data script',
  },
  {
    format: 'markdown',
    icon: 'markdown',
    label: 'Markdown links',
    detail: 'A readable list of titled links for notes',
    aliases: 'md notes links',
  },
]

/** App-local overlays. These shortcuts never enter the browser manifest. */
export default class ActionStore {
  store: Store
  menu: ActionMenuAnchor | null = null
  menuAnchors = new Map<string, ActionMenuAnchor>()
  paletteOpen = false
  selectionPaletteOpen = false
  toolbarFocusRequest = 0
  toolbarFocusTarget: HTMLElement | null = null
  query = ''
  choosingDestination = false
  formatAction: 'copy' | 'export' | null = null
  feedback = ''
  busy = false
  error = ''
  failedMove: { target: PaletteMoveTarget; tabIds: number[] } | null = null
  groupEditorId: number | null = null
  destinationEdge: 'beginning' | 'end' = 'end'
  paletteFocusTarget: HTMLElement | null = null
  paletteToolbarFocusTarget = false
  paletteSearchFocusTarget: { rowId: string; detailsAnchor: boolean } | null =
    null
  paletteDetailsTarget: { tabId: number; surface: 'search' | 'list' } | null =
    null

  constructor(store: Store) {
    this.store = store
    makeAutoObservable(this, {
      store: false,
      menu: observable.ref,
      menuAnchors: observable.shallow,
      paletteFocusTarget: false,
      toolbarFocusTarget: false,
      paletteSearchFocusTarget: false,
      failedMove: observable.ref,
    })
    reaction(
      () => !!this.failedMove && !this.busy && !this.failedMoveMatchesSelection,
      (stale) => {
        // This panel is nonmodal: a new selection starts a new action rather
        // than letting Retry silently restore an earlier set of tabs.
        if (stale) this.back()
      },
    )
  }

  get liteMode() {
    return isLitePopupMode(this.store.userStore.litePopupMode)
  }

  openFullView = (panel?: 'settings' | 'shortcuts') => openFullTabManager(panel)

  getLiteCommands = (
    tab = this.store.focusStore.focusedTab,
  ): PaletteCommand[] => {
    const commands: PaletteCommand[] = [
      {
        id: 'search',
        icon: 'search',
        label: 'Search tabs',
        section: 'Application',
        afterClose: true,
        run: this.store.searchStore.focus,
      },
      {
        id: 'open-full-mode',
        icon: 'window',
        label: 'Open full Tab Manager',
        detail: 'Organize, group, move and export tabs in full view',
        aliases:
          'organize group move sort bulk export csv tsv json markdown selection',
        section: 'Application',
        run: () => this.openFullView(),
      },
      {
        id: 'settings-full',
        icon: 'settings',
        label: 'Settings in full view',
        section: 'Application',
        run: () => this.openFullView('settings'),
      },
      {
        id: 'help-full',
        icon: 'keyboard',
        label: 'Keyboard shortcuts in full view',
        section: 'Application',
        run: () => this.openFullView('shortcuts'),
      },
      {
        id: 'theme',
        icon: 'theme',
        label: 'Change appearance',
        section: 'Application',
        run: this.store.userStore.selectNextTheme,
      },
    ]
    if (!tab) return commands
    const surface = getMountedTabDetailsSurface(tab.id, 'search')
    return [
      {
        id: 'activate-tab',
        icon: 'tab',
        label: 'Go to this tab',
        section: 'This tab',
        afterClose: true,
        run: () => tab.activate(),
      },
      {
        id: 'reload-tab',
        icon: 'reload',
        label: 'Reload this tab',
        section: 'This tab',
        run: tab.reload,
      },
      {
        id: 'pin-tab',
        icon: tab.pinned ? 'unpin' : 'pin',
        label: tab.pinned ? 'Unpin this tab' : 'Pin this tab',
        section: 'This tab',
        run: tab.togglePin,
      },
      {
        id: 'copy-tab',
        icon: 'url',
        label: 'Copy this tab’s URL',
        section: 'This tab',
        run: () => this.copyTabUrl(tab),
      },
      {
        id: 'copy-title-tab',
        icon: 'title',
        label: 'Copy this tab’s title',
        section: 'This tab',
        run: () => this.copyTabTitle(tab),
      },
      {
        id: 'copy-title-url-tab',
        icon: 'title-url',
        label: 'Copy this tab’s title and URL',
        section: 'This tab',
        run: () => this.copyTabTitleAndUrl(tab),
      },
      {
        id: 'tab-details',
        icon: 'details',
        label: 'Show this tab’s title and URL',
        section: 'This tab',
        afterClose: true,
        disabledReason: !this.store.userStore.showTabTooltip
          ? 'Enable tab tooltips in Settings first'
          : !surface
            ? 'Find this tab in search first'
            : undefined,
        run: () => {
          if (surface) this.store.hoverStore.openTooltip(tab.id, true, surface)
        },
      },
      {
        id: 'close-tab',
        icon: 'close',
        label: 'Close this tab',
        section: 'This tab',
        danger: true,
        run: tab.remove,
      },
      ...commands,
    ]
  }

  setDestinationEdge = (edge: 'beginning' | 'end') => {
    this.destinationEdge = edge
  }
  editGroup = (id: number) => {
    this.groupEditorId = id
  }
  closeGroupEditor = () => {
    this.groupEditorId = null
  }

  openMenu = (anchor: ActionMenuAnchor, target?: Focusable) => {
    if (this.store.dragStore.dragging || this.busy) return
    this.closePalette(false)
    this.closeGroupEditor()
    this.closeMenu()
    this.store.hoverStore.hideTooltip()
    if (target) {
      this.store.focusStore.focus(target, {
        origin: 'mouse',
        surface: anchor.element.closest('[data-testid^="search-tab-row-"]')
          ? 'search'
          : 'list',
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

  focusToolbar = () => {
    if (
      this.liteMode ||
      this.busy ||
      this.paletteOpen ||
      this.store.dragStore.dragging ||
      this.store.userStore.dialogOpen ||
      this.store.shortcutStore.dialogOpen
    )
      return
    const target = document.activeElement
    if (target instanceof HTMLElement && !target.closest('.toolbar'))
      this.toolbarFocusTarget = target
    // Settle the workspace search's blur/focus reactions before focusing the
    // dock. Otherwise they can take focus back to the previously focused tab.
    this.store.searchStore.blur()
    this.closeMenu()
    this.store.hoverStore.hideTooltip()
    this.store.userStore.showToolbar()
    if (this.store.tabStore.selection.size) this.openSelectionPalette()
    this.toolbarFocusRequest += 1
  }

  openSelectionPalette = () => {
    if (
      this.selectionPaletteOpen ||
      this.paletteOpen ||
      this.busy ||
      this.liteMode ||
      !this.store.tabStore.selection.size
    )
      return
    this.closeMenu()
    this.back()
    this.selectionPaletteOpen = true
  }

  closeSelectionPalette = () => {
    if (this.busy || !this.selectionPaletteOpen) return
    this.selectionPaletteOpen = false
    this.back()
  }

  openPalette = (query = '') => {
    if (
      this.busy ||
      this.store.dragStore.dragging ||
      this.store.userStore.dialogOpen ||
      this.store.shortcutStore.dialogOpen
    )
      return
    this.closeSelectionPalette()
    if (!this.paletteOpen) {
      const tabId = this.store.focusStore.focusedTab?.id
      const surface =
        tabId != null ? getMountedTabDetailsSurface(tabId) : undefined
      // Remember the caller's visible details surface across overlay actions.
      this.paletteDetailsTarget = surface ? { tabId, surface } : null
      this.paletteFocusTarget =
        this.menu?.element ||
        (document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null)
      this.paletteToolbarFocusTarget =
        !!this.paletteFocusTarget?.closest('.toolbar')
      const searchRow = this.paletteFocusTarget?.closest<HTMLElement>(
        '[data-testid^="search-tab-row-"]',
      )
      this.paletteSearchFocusTarget = searchRow
        ? {
            rowId: searchRow.dataset.testid!,
            detailsAnchor:
              this.paletteFocusTarget?.matches(
                'button[aria-haspopup="dialog"]',
              ) || false,
          }
        : null
    }
    this.closeMenu()
    this.closeGroupEditor()
    this.store.hoverStore.hideTooltip()
    this.query = query
    this.choosingDestination = false
    this.destinationEdge = 'end'
    this.formatAction = null
    this.feedback = ''
    this.error = ''
    this.failedMove = null
    this.paletteOpen = true
  }

  closePalette = (restoreFocus = true) => {
    if (this.busy) return
    const fromSelection =
      this.selectionPaletteOpen &&
      document.activeElement instanceof HTMLElement &&
      !!document.activeElement.closest('[data-selection-palette]')
    this.closeSelectionPalette()
    const wasOpen = this.paletteOpen
    this.paletteOpen = false
    this.choosingDestination = false
    this.formatAction = null
    this.failedMove = null
    this.error = ''
    if (
      (wasOpen || fromSelection) &&
      restoreFocus &&
      !this.store.userStore.dialogOpen &&
      !this.store.shortcutStore.dialogOpen
    ) {
      const target = wasOpen ? this.paletteFocusTarget : null
      const searchTarget = wasOpen ? this.paletteSearchFocusTarget : null
      const toolbarTarget = fromSelection || this.paletteToolbarFocusTarget
      // Resolve after React removes the background's inert state. Use a search
      // replacement if browser updates removed the original row in the meantime.
      // Inline afterClose actions also need a stable caller before a new dialog
      // captures focus; their search field is removed when the panel collapses.
      restoreDialogFocusTarget(() => {
        if (
          this.paletteOpen ||
          this.store.userStore.dialogOpen ||
          this.store.shortcutStore.dialogOpen
        )
          return null
        if (target?.isConnected) return target
        if (toolbarTarget)
          return (
            document.querySelector<HTMLElement>(
              '[data-selection-palette-handle]',
            ) ||
            document.querySelector<HTMLElement>(
              '[data-toolbar-base] button:not(:disabled), [data-toolbar-base] input:not(:disabled)',
            ) ||
            this.store.searchStore.getSearchInputEl()
          )
        if (searchTarget) {
          const row = document.querySelector<HTMLElement>(
            `[data-testid="${searchTarget.rowId}"]`,
          )
          return (
            (searchTarget.detailsAnchor
              ? row?.querySelector<HTMLElement>(
                  'button[aria-haspopup="dialog"]',
                )
              : row) ||
            this.store.searchStore.searchEl?.current ||
            null
          )
        }
        return this.store.focusStore.focusedItem?.nodeRef?.current || null
      })
    }
  }

  setQuery = (query: string) => {
    this.query = query
    this.feedback = ''
  }

  back = () => {
    if (this.busy) return
    this.choosingDestination = false
    this.formatAction = null
    this.feedback = ''
    this.query = ''
    this.error = ''
    this.failedMove = null
  }

  get moveDestinationAvailable() {
    const target = this.failedMove?.target
    if (!target) return false
    if (target.kind === 'group')
      return !!this.store.tabGroupStore.getTabGroup(target.id)
    if (target.kind === 'window')
      return this.store.windowStore.windows.some((win) => win.id === target.id)
    return this.store.windowStore.tabs.some(
      (tab) => tab.id === target.id && !tab.removing,
    )
  }

  get failedMoveMatchesSelection() {
    const failed = this.failedMove
    const selection = this.store.tabStore.selection
    return (
      !!failed &&
      selection.size === failed.tabIds.length &&
      failed.tabIds.every((id) => selection.has(id))
    )
  }

  runMove = async (target: PaletteMoveTarget) => {
    const { windowStore, tabGroupStore, dragStore } = this.store
    if (
      (target.kind === 'window' &&
        !windowStore.windows.some((win) => win.id === target.id)) ||
      (target.kind === 'group' && !tabGroupStore.getTabGroup(target.id))
    )
      throw new PaletteMoveError('That destination is no longer available.')
    const tab =
      target.kind === 'tab'
        ? windowStore.tabs.find((tab) => tab.id === target.id && !tab.removing)
        : null
    if (target.kind === 'tab' && !tab)
      throw new PaletteMoveError('That destination is no longer available.')
    const hint =
      target.kind === 'window'
        ? await dragStore.moveSelectedTabsToWindowEdge(target.id, target.edge)
        : target.kind === 'group'
          ? await dragStore.moveSelectedTabsToGroup(target.id)
          : await dragStore.moveSelectedTabsRelativeToTab(tab, target.before)
    if (hint)
      throw new PaletteMoveError(
        hint === 'Could not move tabs. Please try again.'
          ? 'Couldn’t move these tabs.'
          : hint,
      )
  }

  retryMove = async () => {
    const failed = this.failedMove
    if (!failed || this.busy) return
    this.busy = true
    try {
      await this.store.windowStore.syncAllWindows()
      runInAction(() => {
        this.busy = false
        if (!this.failedMoveMatchesSelection) this.back()
      })
      if (this.failedMove !== failed) return
      if (!this.moveDestinationAvailable) {
        runInAction(() => {
          this.error = 'That destination is no longer available.'
        })
        return
      }
      await this.execute({
        id: 'retry-move',
        icon: 'move',
        label: 'Retry move',
        section: 'Selected tabs',
        moveTarget: failed.target,
        run: () => this.runMove(failed.target),
      })
    } catch {
      runInAction(() => {
        this.busy = false
        this.error = 'Couldn’t refresh your tabs. Please try again.'
      })
    }
  }

  chooseAnotherMoveDestination = () => {
    if (this.busy) return
    this.failedMove = null
    this.error = ''
    this.choosingDestination = true
    this.formatAction = null
    this.query = ''
  }

  moveToTab = (tab: Tab, before: boolean) => {
    const target: PaletteMoveTarget = { kind: 'tab', id: tab.id, before }
    this.openPalette()
    return this.execute({
      id: before ? 'move-before' : 'move-after',
      icon: before ? 'up' : 'down',
      label: before ? 'Move before this tab' : 'Move after this tab',
      section: 'Focused tab',
      moveTarget: target,
      run: () => this.runMove(target),
    })
  }

  showFeedback = (message: string) => {
    if ((this.paletteOpen || this.selectionPaletteOpen) && this.formatAction)
      this.feedback = message
    else this.store.shortcutStore.showMoveHint(message)
  }

  copyTabUrl = (tab: Tab) => this.store.copyTabs([tab], 'url')

  copyTabTitle = (tab: Tab) => this.store.copyTabs([tab], 'title')

  copyTabTitleAndUrl = (tab: Tab) => this.store.copyTabs([tab], 'title-url')

  chooseFormat = (action: 'copy' | 'export') => {
    const formatQuery =
      this.query.match(/\b(csv|tsv|json|markdown|spreadsheet)\b/i)?.[0] || ''
    this.formatAction = action
    this.choosingDestination = false
    this.query = formatQuery
    this.feedback = ''
  }

  moveTabToNewWindow = (tab: Tab) =>
    this.store.windowStore.createNewWindow([tab])

  execute = async (command: PaletteCommand) => {
    if (this.busy || command.disabledReason) return
    this.error = ''
    this.feedback = ''
    this.busy = true
    const tabIds = Array.from(this.store.tabStore.selection.keys()) as number[]
    this.failedMove = null
    try {
      if (command.afterClose) {
        this.busy = false
        this.closePalette()
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        )
      }
      await command.run()
      runInAction(() => {
        this.busy = false
        if (!command.keepOpen) {
          if (this.selectionPaletteOpen) {
            if (!this.store.tabStore.selection.size)
              this.closeSelectionPalette()
            else if (this.choosingDestination || this.formatAction) this.back()
          } else this.closePalette()
        }
      })
    } catch (error) {
      runInAction(() => {
        this.busy = false
        this.error =
          error instanceof PaletteMoveError
            ? error.message
            : 'Could not complete this action. Please try again.'
        if (command.moveTarget)
          this.failedMove = { target: command.moveTarget, tabIds }
        if (!this.paletteOpen && !this.selectionPaletteOpen)
          this.store.shortcutStore.showMoveHint(this.error)
      })
    }
  }

  get commands(): PaletteCommand[] {
    return this.getCommands()
  }

  get selectionCommands(): PaletteCommand[] {
    return this.getCommands({ selectionOnly: true })
  }

  get selectionControls(): PaletteCommand[] {
    const { tabStore, searchStore } = this.store
    return [
      {
        id: 'clear-selection',
        icon: 'deselect',
        label: 'Clear selection',
        section: 'Selection',
        aliases: 'deselect unselect none',
        disabledReason: !tabStore.selection.size
          ? 'Select tabs first'
          : undefined,
        run: tabStore.unselectAll,
      },
      {
        id: 'invert-selection',
        icon: 'invert',
        label: searchStore.queryActive
          ? 'Invert selection of matching tabs'
          : 'Invert selection',
        section: 'Selection',
        shortcut: 'Ctrl U',
        disabledReason: !searchStore.matchedTabs.length
          ? 'No tabs to select'
          : undefined,
        run: searchStore.invertSelect,
      },
    ]
  }

  getCommands({
    selectionOnly = false,
    includeSteps = true,
  } = {}): PaletteCommand[] {
    if (this.liteMode) return this.getLiteCommands()
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
    const copySources =
      selectionOnly && !count
        ? []
        : count
          ? tabStore.sources
          : this.store._getFocusedOrSelectedTab?.() ||
            (focusStore.focusedTab ? [focusStore.focusedTab] : [])
    const copyScope = count
      ? selectedScope
      : focusStore.focusedTab
        ? 'this tab'
        : focusStore.focusedItem instanceof TabGroupRow
          ? 'this group'
          : focusStore.focusedWindow
            ? 'this window'
            : 'selected tabs'
    const copyReason = !copySources.length
      ? 'Select tabs or focus a tab, group or window'
      : undefined
    const selectionReason = !count ? 'Select tabs first' : undefined
    const moveReason = dragStore.pendingWindowEdgeDrop
      ? 'A tab move is already in progress'
      : selectionReason
    if (includeSteps && this.formatAction) {
      const exporting = this.formatAction === 'export'
      return copyFormats.map((option) => ({
        id: `${this.formatAction}-${option.format}`,
        icon: option.icon,
        label: exporting
          ? `Export ${option.format === 'markdown' ? 'Markdown' : option.format.toUpperCase()}`
          : option.format === 'tsv'
            ? `Copy for ${option.label}`
            : `Copy as ${option.label}`,
        detail: option.detail,
        aliases: option.aliases,
        section: `${exporting ? 'Export' : 'Copy'} ${copyScope}`,
        disabledReason: copyReason,
        keepOpen: true,
        run: () => {
          if (exporting) {
            return this.store.exportTabs(copySources, option.format)
          }
          return this.store.copyTabs(copySources, option.format)
        },
      }))
    }
    if (includeSteps && this.choosingDestination) {
      const windowTitle = getWindowLabel
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
            moveTarget: { kind: 'group', id: group.id },
            run: () => this.runMove({ kind: 'group', id: group.id }),
          }
        })
      const windowCommands: PaletteCommand[] = windowStore.windows.map(
        (win) => ({
          id: `move-window-${win.id}`,
          icon: 'window',
          label: windowTitle(win),
          detail: `${win.tabs.length} ${getNoun('tab', win.tabs.length)}${focusStore.focusedWindow?.id === win.id ? ' · Current window' : ''}`,
          section: `Windows · Move to ${this.destinationEdge}`,
          aliases: win.tabs
            .slice(0, 3)
            .map((tab) => tab.url)
            .join(' '),
          disabledReason:
            moveReason ||
            getTabMoveDestinationHint(win, tabStore.selection.values()) ||
            undefined,
          moveTarget: {
            kind: 'window',
            id: win.id,
            edge: this.destinationEdge,
          },
          run: () =>
            this.runMove({
              kind: 'window',
              id: win.id,
              edge: this.destinationEdge,
            }),
        }),
      )
      return [...groups, ...windowCommands]
    }
    const tab = focusStore.focusedTab
    const win = focusStore.focusedWindow
    const focusedItem = focusStore.focusedItem
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
          icon: 'url',
          label: `Copy URLs of ${selectedScope}`,
          section: 'Selected tabs',
          aliases: 'clipboard links',
          shortcut: 'c → c',
          run: () => this.store.copyTabs(tabStore.sources, 'url'),
        },
        {
          id: 'copy-titles-selection',
          icon: 'title',
          label: `Copy titles of ${selectedScope}`,
          section: 'Selected tabs',
          aliases: 'clipboard names',
          run: () => this.store.copyTabs(tabStore.sources, 'title'),
        },
        {
          id: 'copy-titles-urls-selection',
          icon: 'title-url',
          label: `Copy titles and URLs of ${selectedScope}`,
          section: 'Selected tabs',
          aliases: 'clipboard names links',
          shortcut: 'c → t',
          run: () => this.store.copyTabs(tabStore.sources, 'title-url'),
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
    commands.push(
      {
        id: 'copy-format-selection',
        icon: 'copy',
        label: `Copy ${copyScope} as…`,
        section: count ? 'Selected tabs' : 'Selection',
        aliases:
          'copy csv copy tsv spreadsheet copy json copy markdown clipboard table',
        disabledReason: copyReason,
        keepOpen: true,
        run: () => this.chooseFormat('copy'),
      },
      {
        id: 'export-selection',
        icon: 'export',
        label: `Export ${copyScope}…`,
        section: count ? 'Selected tabs' : 'Selection',
        aliases:
          'export csv export tsv export json export markdown download file save',
        disabledReason: copyReason,
        keepOpen: true,
        run: () => this.chooseFormat('export'),
      },
    )
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
    if (selectionOnly) return [...commands, ...this.selectionControls]
    const duplicateCount = windowStore.getDuplicateTabsToRemoveCount()
    const hasTabs = windowStore.windows.some((window) => window.tabs?.length)
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
          icon: 'url',
          label: 'Copy this tab’s URL',
          section: 'Focused tab',
          aliases: 'clipboard link',
          run: () => this.copyTabUrl(tab),
        },
        {
          id: 'copy-title-tab',
          icon: 'title',
          label: 'Copy this tab’s title',
          section: 'Focused tab',
          aliases: 'clipboard name',
          run: () => this.copyTabTitle(tab),
        },
        {
          id: 'copy-title-url-tab',
          icon: 'title-url',
          label: 'Copy this tab’s title and URL',
          section: 'Focused tab',
          aliases: 'clipboard name link',
          run: () => this.copyTabTitleAndUrl(tab),
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
          icon: tab.pinned ? 'unpin' : 'pin',
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
        disabledReason: !searchStore.matchedTabs.length
          ? searchStore.queryActive
            ? 'No matching tabs'
            : 'No tabs to select'
          : undefined,
        run: () => searchStore.toggleSelectAll(),
      },
      this.selectionControls[0],
      {
        id: 'clean-duplicates',
        icon: 'clean-duplicates',
        label: `Close ${duplicateCount} duplicate ${duplicateCount === 1 ? 'tab' : 'tabs'}`,
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
        disabledReason: !hasTabs ? 'No tabs to sort' : undefined,
        shortcut: 'Ctrl S',
        run: () => arrangeStore.sortTabs(),
      },
      {
        id: 'cluster-all',
        icon: 'cluster',
        label: 'Cluster ungrouped tabs by site and sort',
        section: 'Across windows',
        disabledReason: !hasTabs ? 'No tabs to organize' : undefined,
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
        afterClose: true,
        icon: 'settings',
        label: 'Open Settings',
        section: 'Application',
        aliases: 'preferences appearance',
        shortcut: 'Ctrl ,',
        run: userStore.openDialog,
      },
      {
        id: 'help',
        afterClose: true,
        icon: 'keyboard',
        label: 'Show keyboard shortcuts',
        section: 'Application',
        aliases: 'help hotkeys',
        shortcut: '?',
        run: shortcutStore.openDialog,
      },
      {
        id: 'focus-toolbar',
        icon: 'keyboard',
        label: 'Focus toolbar',
        section: 'Application',
        aliases: 'selection palette actions dock',
        shortcut: TOOLBAR_FOCUS_SHORTCUT_LABEL,
        afterClose: true,
        run: this.focusToolbar,
      },
      {
        id: 'theme',
        icon: 'theme',
        label: 'Change appearance',
        detail: `Current: ${userStore.theme === 'system' ? 'System' : userStore.theme === 'dark' ? 'Dark' : 'Light'}`,
        section: 'Application',
        aliases: 'theme system dark light appearance',
        shortcut: 'Ctrl I',
        run: userStore.selectNextTheme,
      },
    )
    const groupId =
      focusedItem instanceof TabGroupRow ? focusedItem.groupId : tab?.groupId
    const focusedGroup = tabGroupStore?.getTabGroup?.(groupId)
    const focusedGroupTabs = focusedGroup
      ? tabGroupStore.getTabsForGroup(groupId)
      : []
    const groupReason = !tabGroupStore?.canMutateGroups?.()
      ? 'Tab groups are unavailable in this browser'
      : !focusedGroup
        ? 'Focus a grouped tab or group first'
        : undefined
    const creationTabs = count ? tabStore.sources : tab ? [tab] : []
    const createGroupReason = !tabGroupStore?.canMutateGroups?.()
      ? 'Tab groups are unavailable in this browser'
      : !tabGroupStore.canCreateGroupFromTabs(creationTabs)
        ? 'Select at least two tabs in the same window'
        : undefined
    const focusedLabel = tab
      ? 'this tab'
      : focusedItem instanceof TabGroupRow
        ? 'this group'
        : win
          ? 'this window'
          : 'the focused item'
    const containerLabel =
      focusedItem instanceof TabGroupRow || focusedGroup
        ? 'this group'
        : 'this window'
    commands.push(
      {
        id: 'search',
        icon: 'search',
        label: 'Search tabs',
        section: 'Application',
        shortcut: '/',
        afterClose: true,
        run: () => searchStore.focus(),
      },
      {
        id: 'open-app-tab',
        icon: 'window',
        label: 'Open Tab Manager in a browser tab',
        section: 'Application',
        shortcut: 'Ctrl O',
        run: openInNewTab,
      },
      {
        id: 'open-full-mode',
        icon: 'new-window',
        label: 'Open full feature mode',
        section: 'Application',
        run: openOrTogglePopup,
      },
      this.selectionControls[1],
      {
        id: 'select-all-matching',
        icon: 'select',
        label: 'Select all matching tabs',
        section: 'Selection',
        shortcut: 'Ctrl M',
        disabledReason: !searchStore.matchedTabs.length
          ? 'No matching tabs'
          : undefined,
        run: () => searchStore.selectAll(),
      },
      {
        id: 'select-focused',
        icon: 'select',
        label: `Toggle selection for ${focusedLabel}`,
        section: tab
          ? 'Focused tab'
          : focusedGroup
            ? 'Focused group'
            : 'Focused window',
        disabledReason: !focusedItem
          ? 'Focus a tab, group or window first'
          : undefined,
        shortcut: 'Space',
        run: () => focusStore.select(),
      },
      {
        id: 'select-container',
        icon: 'select',
        label: `Toggle selection in ${containerLabel}`,
        section:
          focusedItem instanceof TabGroupRow
            ? 'Focused group'
            : 'Focused window',
        disabledReason: !win
          ? 'Focus a window or one of its tabs first'
          : undefined,
        shortcut: 'Shift X',
        run: () => focusStore.selectWindow(),
      },
      {
        id: 'create-group',
        icon: 'group',
        label: count
          ? `Create a group from ${selectedScope}`
          : 'Create a group from selected tabs',
        section: count ? 'Selected tabs' : 'Selection',
        disabledReason: createGroupReason,
        shortcut: 'Alt Shift G',
        run: () => focusStore.createGroupFromFocusedOrSelectedTabs(),
      },
      {
        id: 'collapse-all',
        icon: 'collapse',
        label: 'Collapse all windows',
        section: 'Across windows',
        shortcut: 'w → c',
        disabledReason: !windowStore.windows.length
          ? 'No windows to collapse'
          : undefined,
        run: () => this.store.hiddenWindowStore.updateHideForAllWindows(true),
      },
      {
        id: 'expand-all',
        icon: 'expand',
        label: 'Expand all windows',
        section: 'Across windows',
        shortcut: 'w → e',
        disabledReason: !windowStore.windows.length
          ? 'No windows to expand'
          : undefined,
        run: () => this.store.hiddenWindowStore.updateHideForAllWindows(false),
      },
      {
        id: 'toggle-all-windows',
        icon: 'window',
        label: 'Toggle collapse for all windows',
        section: 'Across windows',
        shortcut: 'w → t',
        disabledReason: !windowStore.windows.length
          ? 'No windows to toggle'
          : undefined,
        run: () => this.store.hiddenWindowStore.toggleHideForAllWindows(),
      },
      {
        id: 'copy-comma',
        icon: 'url',
        label: count
          ? `Copy URLs of ${selectedScope}, comma-separated`
          : `Copy URLs in ${focusedLabel}, comma-separated`,
        section: count
          ? 'Selected tabs'
          : tab
            ? 'Focused tab'
            : focusedGroup
              ? 'Focused group'
              : 'Focused window',
        shortcut: 'c → ,',
        disabledReason:
          !count && !focusedItem
            ? 'Select tabs or focus a tab, group or window'
            : undefined,
        run: () => this.store.copyTabsInfo({ delimiter: ', ' }),
      },
    )
    const detailsSurface = tab
      ? getMountedTabDetailsSurface(tab.id) ||
        (this.paletteOpen && this.paletteDetailsTarget?.tabId === tab.id
          ? this.paletteDetailsTarget.surface
          : undefined)
      : undefined
    if (tab)
      commands.push(
        {
          id: 'activate-tab',
          afterClose: true,
          icon: 'tab',
          label: 'Go to this tab',
          section: 'Focused tab',
          shortcut: 'Enter',
          run: () => tab.activate(),
        },
        {
          id: 'tab-details',
          icon: 'details',
          label: 'Show this tab’s title and URL',
          section: 'Focused tab',
          aliases: 'tooltip details inspect',
          disabledReason: !userStore.showTabTooltip
            ? 'Enable tab tooltips in Settings first'
            : !detailsSurface
              ? 'Reveal this tab in the workspace or search results first'
              : undefined,
          shortcut: 'Alt Down',
          afterClose: true,
          run: () => {
            if (detailsSurface)
              this.store.hoverStore.openTooltip(tab.id, true, detailsSurface)
          },
        },
        {
          id: 'close-other-tabs',
          icon: 'close-others',
          label: `Close ${Math.max(0, (tab.win?.tabs.length || 1) - 1)} other tabs in this window`,
          section: 'Focused tab',
          danger: true,
          disabledReason:
            (tab.win?.tabs.length || 0) < 2
              ? 'No other tabs in this window'
              : undefined,
          run: () => tab.closeOtherTabs(),
        },
        {
          id: 'close-tab-duplicates',
          icon: 'clean-duplicates',
          label: 'Close duplicates of this tab',
          section: 'Focused tab',
          danger: true,
          disabledReason: !tab.isDuplicated
            ? 'This tab has no duplicates'
            : undefined,
          run: () => tab.closeDuplicatedTab(),
        },
        {
          id: 'bring-same-site',
          icon: 'cluster',
          label: 'Bring ungrouped tabs from this site here',
          section: 'Focused tab',
          shortcut: 'Ctrl G',
          aliases: 'domain gather cluster',
          run: () => focusStore.groupTab(),
        },
      )
    if (win)
      commands.push({
        id: 'close-window',
        icon: 'close-window',
        label: `Close this window · ${win.tabs.length} tabs`,
        section: 'Focused window',
        danger: true,
        shortcut: 'Alt D',
        run: () => win.close(),
      })
    if (focusedGroup) {
      if (tab)
        commands.push({
          id: 'reload-group',
          icon: 'reload',
          label: `Reload ${focusedGroupTabs.length} tabs in this group`,
          section: 'Focused group',
          run: () => Promise.all(focusedGroupTabs.map((item) => item.reload())),
        })
      commands.push(
        {
          id: 'edit-group',
          icon: 'edit',
          label: `Edit group “${focusedGroup.title || 'Unnamed group'}”`,
          section: 'Focused group',
          disabledReason: groupReason,
          afterClose: true,
          run: () => {
            this.editGroup(groupId)
          },
        },
        {
          id: 'collapse-group',
          icon: focusedGroup.collapsed ? 'expand' : 'collapse',
          label: `${focusedGroup.collapsed ? 'Expand' : 'Collapse'} this group`,
          section: 'Focused group',
          disabledReason: groupReason,
          shortcut: 'Alt G',
          run: () => tabGroupStore.toggleCollapsed(groupId),
        },
        {
          id: 'ungroup-group',
          icon: 'ungroup',
          label: 'Ungroup tabs in this group',
          section: 'Focused group',
          disabledReason: groupReason,
          shortcut: 'Alt U',
          run: () => tabGroupStore.ungroup(groupId),
        },
        {
          id: 'close-group',
          icon: 'close',
          label: `Close this group · ${focusedGroupTabs.length} tabs`,
          section: 'Focused group',
          danger: true,
          run: () => {
            const ids = focusedGroupTabs.map((item) => item.id)
            const next = this.store.prepareFocusForRemovedTabs(focusedGroupTabs)
            windowStore.removeTabs(ids)
            this.store.restoreDomFocusAfterRemoval(next)
            return browser.tabs.remove(ids)
          },
        },
        {
          id: 'clean-group-duplicates',
          icon: 'clean-duplicates',
          label: 'Close duplicates in this group',
          section: 'Focused group',
          danger: true,
          disabledReason: !windowStore.getDuplicateTabsToRemoveCount(
            focusedGroupTabs,
          )
            ? 'This group has no duplicates'
            : undefined,
          run: () => windowStore.cleanDuplicateTabs(focusedGroupTabs),
        },
      )
    }
    if (!count && (focusedItem instanceof TabGroupRow || (win && !tab))) {
      const scopeTabs =
        focusedItem instanceof TabGroupRow ? focusedGroupTabs : win.tabs
      const section =
        focusedItem instanceof TabGroupRow ? 'Focused group' : 'Focused window'
      commands.push(
        {
          id: 'copy-scope',
          icon: 'url',
          label: `Copy URLs in ${focusedLabel}`,
          section,
          run: () => this.store.copyTabs(scopeTabs, 'url'),
        },
        {
          id: 'copy-title-scope',
          icon: 'title',
          label: `Copy titles in ${focusedLabel}`,
          section,
          run: () => this.store.copyTabs(scopeTabs, 'title'),
        },
        {
          id: 'copy-title-url-scope',
          icon: 'title-url',
          label: `Copy titles and URLs in ${focusedLabel}`,
          section,
          run: () => this.store.copyTabs(scopeTabs, 'title-url'),
        },
        {
          id: 'pin-scope',
          icon: 'pin',
          label: `Toggle pin for ${focusedLabel}`,
          section,
          run: () => this.store.togglePin(),
        },
      )
    }
    for (const position of ['beginning', 'end', 'before', 'after'] as const) {
      const relative = position === 'before' || position === 'after'
      const destination = relative ? tab?.win : win
      const reason =
        moveReason ||
        (!destination
          ? relative
            ? 'Focus a destination tab'
            : 'Focus a destination window'
          : relative && tabStore.selection.has(tab.id)
            ? 'Choose an unselected destination tab'
            : getTabMoveDestinationHint(
                destination,
                tabStore.selection.values(),
              ) || undefined)
      commands.push({
        id: `move-${position}`,
        icon: position === 'beginning' || position === 'before' ? 'up' : 'down',
        label: `Move ${count ? selectedScope : 'selected tabs'} ${relative ? position + ' this tab' : 'to this window’s ' + position}`,
        section: relative ? 'Focused tab' : 'Focused window',
        disabledReason: reason,
        moveTarget: relative
          ? { kind: 'tab', id: tab?.id, before: position === 'before' }
          : {
              kind: 'window',
              id: win?.id,
              edge: position as 'beginning' | 'end',
            },
        run: () =>
          this.runMove(
            relative
              ? { kind: 'tab', id: tab.id, before: position === 'before' }
              : {
                  kind: 'window',
                  id: win.id,
                  edge: position as 'beginning' | 'end',
                },
          ),
      })
    }
    for (const [id, label, callback, shortcut] of [
      ['left', 'Focus tab to the left', focusStore.left, 'h'],
      ['right', 'Focus tab to the right', focusStore.right, 'l'],
      ['down', 'Focus next tab', focusStore.down, 'j'],
      ['up', 'Focus previous tab', focusStore.up, 'k'],
      ['first', 'Focus first tab', focusStore.firstTab, 'g → g'],
      ['last', 'Focus last tab', focusStore.lastTab, 'Shift G'],
    ] as const)
      commands.push({
        id: 'navigate-' + id,
        icon:
          id === 'left' || id === 'right'
            ? id
            : id === 'up' || id === 'first'
              ? 'up'
              : 'down',
        label,
        section: 'Navigation',
        shortcut,
        afterClose: true,
        disabledReason: !hasTabs ? 'No tabs to navigate' : undefined,
        run: () => callback(),
      })
    if (process.env.TARGET_BROWSER === 'firefox')
      commands.push(
        {
          id: 'new-window-container',
          icon: 'new-window',
          label: 'Open tabs from this Firefox container in a new window',
          section: 'Focused tab',
          disabledReason: !tab ? 'Focus a tab first' : undefined,
          run: () => tab.openSameContainerTabs(),
        },
        {
          id: 'select-container-tabs',
          icon: 'select',
          label: 'Toggle selection for tabs in this Firefox container',
          section: 'Focused tab',
          shortcut: 'Alt X',
          disabledReason: !tab ? 'Focus a tab first' : undefined,
          run: () => focusStore.selectTabsInSameContainer(),
        },
        {
          id: 'group-containers',
          icon: 'group',
          label: 'Group tabs by Firefox container',
          section: 'Across windows',
          shortcut: 'Alt C',
          disabledReason: !hasTabs ? 'No tabs to organize' : undefined,
          run: () => this.store.containerStore.groupTabsByContainer(),
        },
      )

    {
      const sectionOrder = hasTabs
        ? [
            'Selected tabs',
            'Focused tab',
            'Focused group',
            'Focused window',
            'Selection',
            'Across windows',
            'Application',
            'Navigation',
          ]
        : [
            'Application',
            'Selection',
            'Across windows',
            'Focused tab',
            'Focused group',
            'Focused window',
            'Navigation',
          ]
      commands.sort(
        (a, b) =>
          sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section),
      )
    }
    return commands
  }
}
