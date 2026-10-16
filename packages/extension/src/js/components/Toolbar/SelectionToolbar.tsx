import React, { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import IconButton from 'components/ui/IconButton'
import { useCombobox } from 'components/ui/Combobox'
import CommandPaletteIcon from 'components/CommandPaletteIcon'
import { useAppTheme } from 'libs/appTheme'
import { matchCommandItems } from 'libs/commandMatching'
import { TOOLBAR_FOCUS_SHORTCUT_LABEL } from 'libs/toolbarFocusShortcut'
import { SearchIcon } from 'icons/actionIcons'
import { ExpandMoreIcon, KeyboardArrowLeftIcon } from 'icons/materialIcons'
import type { PaletteCommand } from 'stores/ActionStore'

const actionOrder = [
  'new-window-selection',
  'clear-selection',
  'invert-selection',
  'move-selection',
  'reload-selection',
  'pin-selection',
  'copy-selection',
  'copy-titles-selection',
  'copy-titles-urls-selection',
  'copy-format-selection',
  'export-selection',
  'close-selection',
]
const actionLabels: Record<string, string> = {
  'new-window-selection': 'Move to new window',
  'move-selection': 'Move to window or group…',
  'reload-selection': 'Reload',
  'pin-selection': 'Toggle pin',
  'copy-selection': 'Copy links',
  'copy-titles-selection': 'Copy titles',
  'copy-titles-urls-selection': 'Copy titles and links',
  'copy-format-selection': 'Copy as…',
  'export-selection': 'Export…',
}
function focusWorkspaceToolbar() {
  const fallback =
    document.querySelector<HTMLElement>(
      '[data-toolbar-base] input[type="checkbox"]:not(:disabled), [data-toolbar-base] button[aria-haspopup="menu"]:not(:disabled)',
    ) || document.querySelector<HTMLElement>('input[role="combobox"]')
  fallback?.focus({ preventScroll: true })
}

export default observer(function SelectionToolbar() {
  const { tabStore, actionStore } = useStore()
  const theme = useAppTheme()
  const count = tabStore.selection.size
  const expanded = actionStore.selectionPaletteOpen
  const rootRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const recoveryRef = useRef<HTMLButtonElement>(null)
  const hadFocus = useRef(false)
  const escapeStartedHere = useRef(false)
  const focusFrame = useRef<number | null>(null)
  const panelId = useId()
  const step = actionStore.choosingDestination
    ? 'destinations'
    : actionStore.formatAction || 'actions'
  const previousFocusState = useRef({
    step,
    busy: actionStore.busy,
    failedMove: actionStore.failedMove,
  })
  const choosingStep = step !== 'actions'
  const query = actionStore.query
  const commands = expanded ? actionStore.selectionCommands : []
  const ordered = choosingStep
    ? commands
    : actionOrder.flatMap((id) => {
        const command = commands.find((candidate) => candidate.id === id)
        if (!command) return []
        return [
          {
            ...command,
            label:
              actionLabels[id] ||
              (id === 'close-selection'
                ? `Close ${count} ${count === 1 ? 'tab' : 'tabs'}`
                : command.label),
            aliases: `${command.label} ${command.aliases || ''}`,
            section: command.danger
              ? 'Close'
              : id.startsWith('copy-') || id === 'export-selection'
                ? 'Copy and export'
                : 'Selection',
          },
        ]
      })
  const keys = ['label', 'aliases', 'detail']
  const items = actionStore.choosingDestination
    ? ['group', 'window'].flatMap((icon) =>
        matchCommandItems(
          ordered.filter((command) => command.icon === icon),
          query,
          keys,
        ),
      )
    : matchCommandItems(ordered, query, keys)
  const runCommand = async (command: PaletteCommand) => {
    if (actionStore.busy) return
    rootRef.current
      ?.querySelector<HTMLInputElement>('[data-selection-action-search]')
      ?.focus({ preventScroll: true })
    const ownedFocus = rootRef.current?.contains(document.activeElement)
    await actionStore.execute(command)
    if (
      !tabStore.selection.size &&
      (ownedFocus || command.id === 'clear-selection')
    ) {
      if (
        document.activeElement === document.body ||
        rootRef.current?.contains(document.activeElement)
      )
        focusWorkspaceToolbar()
    }
  }
  const {
    highlightedIndex,
    getRootProps,
    getInputProps,
    getListboxProps,
    getItemProps,
  } = useCombobox({
    items,
    inputValue: query,
    onInputValueChange: actionStore.setQuery,
    onSelect: runCommand,
    isItemDisabled: (command) => actionStore.busy || !!command.disabledReason,
    isOpen: expanded,
    highlightResetKey: step,
  })
  const rootProps = getRootProps()
  const inputProps = getInputProps()
  const listboxProps = getListboxProps()
  const collapse = (restoreCaller: boolean) => {
    if (actionStore.busy) return
    actionStore.closeSelectionPalette()
    if (focusFrame.current != null) cancelAnimationFrame(focusFrame.current)
    focusFrame.current = requestAnimationFrame(() => {
      const caller = actionStore.toolbarFocusTarget
      if (restoreCaller && caller?.isConnected && !caller.closest('.toolbar'))
        caller.focus({ preventScroll: true })
      else handleRef.current?.focus({ preventScroll: true })
    })
  }
  useEffect(
    () => () => {
      if (focusFrame.current != null) cancelAnimationFrame(focusFrame.current)
    },
    [],
  )
  useLayoutEffect(() => {
    const { busy, error, failedMove } = actionStore
    const previous = previousFocusState.current
    const active = document.activeElement
    const ownsFocus =
      rootRef.current?.contains(active) ||
      (hadFocus.current && active === document.body)
    if (!count && ownsFocus && !busy && !error) {
      hadFocus.current = false
      focusWorkspaceToolbar()
    } else if (
      expanded &&
      !busy &&
      ownsFocus &&
      (previous.step !== step ||
        previous.failedMove !== failedMove ||
        previous.busy)
    ) {
      // Recovery can end without changing steps, or temporarily disable its
      // focused Retry button. Restore within the panel only if it owned focus.
      const target = failedMove ? recoveryRef.current : inputProps.ref.current
      target?.focus({ preventScroll: true })
    }
    previousFocusState.current = { step, busy, failedMove }
  }, [
    count,
    expanded,
    actionStore.busy,
    actionStore.error,
    actionStore.failedMove,
    step,
  ])
  useEffect(() => {
    const list = listRef.current
    const item = list?.querySelector<HTMLElement>('[aria-selected="true"]')
    // Scroll only the command list, never the workspace under this dock.
    if (list && item) {
      const itemRect = item.getBoundingClientRect()
      const listRect = list.getBoundingClientRect()
      if (itemRect.top < listRect.top)
        list.scrollTop -= listRect.top - itemRect.top
      else if (itemRect.bottom > listRect.bottom)
        list.scrollTop += itemRect.bottom - listRect.bottom
    }
  }, [highlightedIndex, query, step])
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [query, step])
  if (!count && !(expanded && (actionStore.busy || actionStore.error)))
    return null
  const inputLabel = actionStore.choosingDestination
    ? 'Search selection destinations'
    : actionStore.formatAction
      ? 'Search selection formats'
      : 'Search selected-tab actions'
  return (
    <div
      {...rootProps}
      ref={(node) => {
        rootRef.current = node
        rootProps.ref.current = node
      }}
      data-selection-palette
      className="selection-toolbar-content"
      role="group"
      aria-label="Selected tab actions"
      style={{ color: theme.palette.text.primary }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          escapeStartedHere.current = true
          event.preventDefault()
        }
        if (['Escape', 'Enter', ' '].includes(event.key))
          event.stopPropagation()
      }}
      onKeyUp={(event) => {
        if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          // A dialog may close on keydown and restore this handle before keyup.
          // That release belongs to the dialog, not a second palette dismissal.
          if (!escapeStartedHere.current) return
          escapeStartedHere.current = false
          if (choosingStep && !actionStore.failedMove) actionStore.back()
          else collapse(true)
        }
      }}
      onFocusCapture={(event) => {
        hadFocus.current = true
        const from = event.relatedTarget as HTMLElement | null
        if (from && !from.closest('.toolbar'))
          actionStore.toolbarFocusTarget = from
      }}
      onBlurCapture={(event) => {
        const next = event.relatedTarget as HTMLElement | null
        if (next && !event.currentTarget.contains(next)) {
          hadFocus.current = false
          escapeStartedHere.current = false
        }
      }}
    >
      {!expanded && (
        <IconButton
          ref={handleRef}
          data-selection-palette-handle
          aria-label={`Expand actions for ${count} selected ${count === 1 ? 'tab' : 'tabs'}`}
          aria-expanded={false}
          aria-controls={panelId}
          title={`Selection actions (${TOOLBAR_FOCUS_SHORTCUT_LABEL})`}
          onClick={actionStore.focusToolbar}
          style={{
            width: '100%',
            height: 'auto',
            minHeight: 32,
            minWidth: 0,
            justifyContent: 'space-between',
            padding: '4px 12px',
            borderRadius: 0,
          }}
        >
          <span className="selection-toolbar-count" role="status">
            {count} selected
          </span>
          <ExpandMoreIcon
            fontSize={20}
            style={{ transform: 'rotate(180deg)' }}
          />
        </IconButton>
      )}
      <div id={panelId} hidden={!expanded} className="selection-palette-panel">
        {expanded && (
          <>
            <div
              className="selection-palette-search"
              style={{ borderColor: theme.palette.divider }}
            >
              <SearchIcon fontSize={16} />
              <input
                {...inputProps}
                data-selection-action-search
                autoComplete="off"
                spellCheck={false}
                aria-label={inputLabel}
                aria-controls={listboxProps.id}
                aria-describedby={`${panelId}-count`}
                placeholder={
                  choosingStep
                    ? actionStore.choosingDestination
                      ? 'Find a destination…'
                      : 'Find a format…'
                    : 'Find an action…'
                }
                readOnly={actionStore.busy}
                onKeyDown={(event) => {
                  if (event.key !== 'Escape') inputProps.onKeyDown(event)
                }}
              />
              <span
                id={`${panelId}-count`}
                role="status"
                className="selection-toolbar-count"
              >
                {count} selected
              </span>
              <IconButton
                aria-label={`Collapse actions for ${count} selected ${count === 1 ? 'tab' : 'tabs'}`}
                aria-expanded
                aria-controls={panelId}
                disabled={actionStore.busy}
                controlSize="compact"
                onClick={() => collapse(false)}
              >
                <ExpandMoreIcon fontSize={20} />
              </IconButton>
            </div>
            {choosingStep && (
              <button
                type="button"
                className="selection-palette-back"
                disabled={actionStore.busy}
                onClick={actionStore.back}
              >
                <KeyboardArrowLeftIcon fontSize={16} /> Back to actions
              </button>
            )}
            {actionStore.choosingDestination && (
              <div className="selection-palette-position">
                <span>Window position</span>
                {(['beginning', 'end'] as const).map((edge) => (
                  <button
                    key={edge}
                    type="button"
                    disabled={actionStore.busy}
                    aria-pressed={actionStore.destinationEdge === edge}
                    onClick={() => actionStore.setDestinationEdge(edge)}
                    style={{
                      borderColor: theme.palette.divider,
                      backgroundColor:
                        actionStore.destinationEdge === edge
                          ? theme.palette.action.selected
                          : undefined,
                    }}
                  >
                    {edge === 'beginning' ? 'Beginning' : 'End'}
                  </button>
                ))}
              </div>
            )}
            <ul
              {...listboxProps}
              ref={listRef}
              className="selection-palette-list"
              aria-label={
                choosingStep
                  ? actionStore.choosingDestination
                    ? 'Selection destinations'
                    : 'Selection formats'
                  : 'Selection actions'
              }
              aria-busy={actionStore.busy}
            >
              {items.map((command, index) => (
                <li
                  key={command.id}
                  {...getItemProps({ index, item: command })}
                  className="selection-palette-option"
                  style={{
                    borderTop:
                      index > 0 && items[index - 1].section !== command.section
                        ? `1px solid ${theme.palette.divider}`
                        : undefined,
                    backgroundColor:
                      highlightedIndex === index
                        ? theme.palette.action.hover
                        : undefined,
                    boxShadow:
                      highlightedIndex === index
                        ? `inset 0 0 0 1px ${theme.palette.divider}`
                        : undefined,
                    color: command.danger
                      ? theme.mode === 'dark'
                        ? theme.palette.danger.hoverColor
                        : theme.palette.danger.activeColor
                      : undefined,
                    opacity:
                      command.disabledReason || actionStore.busy ? 0.55 : 1,
                  }}
                >
                  <CommandPaletteIcon
                    name={command.icon}
                    danger={command.danger}
                    groupColor={command.groupColor}
                  />
                  <span className="selection-palette-label">
                    <span>{command.label}</span>
                    {command.detail && (
                      <span
                        className="selection-palette-detail"
                        style={{ color: theme.palette.text.secondary }}
                      >
                        {command.detail}
                      </span>
                    )}
                    {command.disabledReason && (
                      <span
                        className="selection-palette-detail"
                        style={{ color: theme.palette.text.secondary }}
                      >
                        {command.disabledReason}
                      </span>
                    )}
                  </span>
                  {command.shortcut && (
                    <kbd className="selection-palette-shortcut">
                      {command.shortcut}
                    </kbd>
                  )}
                </li>
              ))}
              {!items.length && (
                <li role="status" className="selection-palette-empty">
                  No matching{' '}
                  {choosingStep
                    ? actionStore.choosingDestination
                      ? 'destinations'
                      : 'formats'
                    : 'actions'}
                </li>
              )}
            </ul>
            {actionStore.feedback && (
              <p role="status" className="selection-palette-feedback">
                {actionStore.feedback}
              </p>
            )}
            {actionStore.error && (
              <div className="selection-palette-error">
                <p role="alert">{actionStore.error}</p>
                <div className="flex gap-2 mt-2">
                  {actionStore.failedMove && (
                    <button
                      type="button"
                      ref={recoveryRef}
                      className="shortcut-run-button"
                      disabled={actionStore.busy}
                      onClick={
                        actionStore.moveDestinationAvailable
                          ? actionStore.retryMove
                          : actionStore.chooseAnotherMoveDestination
                      }
                    >
                      {actionStore.moveDestinationAvailable
                        ? 'Retry'
                        : 'Choose another destination'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="shortcut-run-button"
                    disabled={actionStore.busy}
                    onClick={() => collapse(true)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div
              className="selection-palette-footer"
              style={{
                borderColor: theme.palette.divider,
                color: theme.palette.text.secondary,
              }}
            >
              <span>
                {actionStore.busy ? 'Working…' : '↑ ↓ navigate · Enter run'}
              </span>
              <span>Esc {choosingStep ? 'back' : 'collapse'}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
})
