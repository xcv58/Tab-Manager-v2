import React, { useEffect, useId, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { matchSorter } from 'match-sorter'
import Dialog from 'components/ui/Dialog'
import ControlIconButton from 'components/ControlIconButton'
import { useCombobox } from 'components/ui/Combobox'
import { useAppTheme } from 'libs/appTheme'
import { useStore } from './hooks/useStore'
import { CloseIcon, KeyboardArrowLeftIcon } from 'icons/materialIcons'
import { SearchIcon } from 'icons/actionIcons'
import { getCommandPaletteShortcutLabel } from 'libs/commandPaletteShortcut'
import type { PaletteCommand } from 'stores/ActionStore'
import TabGroupRow from 'stores/TabGroupRow'
import CommandPaletteIcon from './CommandPaletteIcon'

const isDisabled = (command: PaletteCommand) => Boolean(command.disabledReason)

// The same real stores and menu actions power both extension and website demo.
const PaletteDialog = observer(function PaletteDialog() {
  const { actionStore, focusStore, tabStore, tabGroupStore } = useStore()
  const theme = useAppTheme()
  const titleId = useId()
  const contextId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const commands = actionStore.commands
  const query = actionStore.query.trim()
  const items = query
    ? matchSorter(commands, query, {
        keys: ['label', 'aliases', 'section'],
        baseSort: (a, b) => a.index - b.index,
      })
    : commands
  const { highlightedIndex, getInputProps, getListboxProps, getItemProps } =
    useCombobox({
      items,
      inputValue: actionStore.query,
      onInputValueChange: actionStore.setQuery,
      onSelect: actionStore.execute,
      isItemDisabled: isDisabled,
      isOpen: actionStore.paletteOpen,
    })
  const inputProps = getInputProps()
  const listboxProps = getListboxProps()
  const tab = focusStore.focusedTab
  const win = focusStore.focusedWindow
  const focusedItem = focusStore.focusedItem
  const groupTitle =
    focusedItem instanceof TabGroupRow
      ? tabGroupStore?.getTabGroup(focusedItem.groupId)?.title ||
        'Unnamed group'
      : ''
  const context =
    [
      tabStore.selection.size ? `${tabStore.selection.size} selected tabs` : '',
      tab
        ? `Focused tab: ${tab.title}`
        : groupTitle
          ? `Focused group: ${groupTitle}`
          : win
            ? `Focused window: ${win.tabs.find((tab) => tab.active)?.title || win.tabs[0]?.title || 'Empty window'}`
            : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'Commands for your workspace'

  useEffect(() => {
    if (!actionStore.paletteOpen || actionStore.busy) return
    const frame = requestAnimationFrame(() =>
      inputProps.ref.current?.focus({ preventScroll: true }),
    )
    return () => cancelAnimationFrame(frame)
  }, [actionStore.paletteOpen, actionStore.busy])

  useEffect(() => {
    if (highlightedIndex >= 0) {
      listRef.current
        ?.querySelector('[aria-selected="true"]')
        ?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex, actionStore.choosingWindow, query])

  return (
    <Dialog
      open={actionStore.paletteOpen}
      onClose={() => actionStore.closePalette()}
      disableRestoreFocus
      aria-labelledby={titleId}
      data-testid="command-palette"
      transitionDuration={100}
      style={{
        width: 580,
        maxWidth: 'calc(100vw - 24px)',
        margin: 12,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 12,
      }}
    >
      <div
        style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
          }
        }}
        onKeyUp={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            if (actionStore.choosingWindow) actionStore.back()
            else actionStore.closePalette()
          }
        }}
      >
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <h2 id={titleId} className="flex-1 text-sm font-semibold">
            {actionStore.choosingWindow
              ? 'Choose a destination window'
              : 'Command palette'}
          </h2>
          <kbd className="text-xs opacity-60">
            {getCommandPaletteShortcutLabel()}
          </kbd>
          <ControlIconButton
            aria-label="Close command palette"
            controlSize="compact"
            onClick={() => actionStore.closePalette()}
            disabled={actionStore.busy}
          >
            <CloseIcon fontSize={16} />
          </ControlIconButton>
        </div>
        <div
          className="flex items-center gap-2 mx-4 rounded-lg px-3 py-2"
          style={{ backgroundColor: theme.palette.action.hover }}
        >
          <SearchIcon fontSize={18} />
          <input
            {...inputProps}
            aria-label={
              actionStore.choosingWindow
                ? 'Search destination windows'
                : 'Search commands'
            }
            aria-describedby={contextId}
            aria-controls={listboxProps.id}
            placeholder={
              actionStore.choosingWindow
                ? 'Find a window by its active tab…'
                : 'What would you like to do?'
            }
            disabled={actionStore.busy}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') inputProps.onKeyDown(event)
            }}
            style={{
              border: 0,
              outline: 'none',
              background: 'transparent',
              color: 'inherit',
              width: '100%',
              minWidth: 0,
              fontSize: 14,
            }}
          />
        </div>
        <p
          id={contextId}
          title={context}
          className="line-clamp-2 px-4 py-2 text-xs break-words"
          style={{ color: theme.palette.text.secondary }}
        >
          {context}
        </p>
        {actionStore.choosingWindow && (
          <button
            type="button"
            className="flex items-center px-4 py-2 text-xs text-left"
            onClick={actionStore.back}
            disabled={actionStore.busy}
          >
            <KeyboardArrowLeftIcon fontSize={16} /> Back to commands
          </button>
        )}
        <ul
          {...listboxProps}
          ref={listRef}
          aria-label={
            actionStore.choosingWindow ? 'Destination windows' : 'Commands'
          }
          aria-busy={actionStore.busy}
          style={{
            overflowY: 'auto',
            minHeight: 0,
            maxHeight: 'min(420px, calc(100vh - 220px))',
            margin: 0,
            padding: '0 6px 6px',
            listStyle: 'none',
          }}
        >
          {items.map((command, index) => (
            <React.Fragment key={command.id}>
              {(!index || items[index - 1].section !== command.section) && (
                <li
                  role="presentation"
                  className="px-3 pt-3 pb-1 text-xs font-semibold"
                  style={{ color: theme.palette.text.secondary }}
                >
                  {command.section}
                </li>
              )}
              <li
                {...getItemProps({ index, item: command })}
                className="flex items-center gap-3 rounded-lg text-sm"
                style={{
                  padding: '10px 12px',
                  minHeight: 40,
                  backgroundColor:
                    highlightedIndex === index
                      ? theme.palette.action.hover
                      : undefined,
                  cursor:
                    command.disabledReason || actionStore.busy
                      ? 'default'
                      : 'pointer',
                  color: command.danger
                    ? theme.mode === 'dark'
                      ? theme.palette.danger.hoverColor
                      : theme.palette.danger.activeColor
                    : undefined,
                  opacity: command.disabledReason ? 0.55 : 1,
                  boxShadow:
                    highlightedIndex === index
                      ? `inset 0 0 0 1px ${theme.palette.divider}`
                      : undefined,
                }}
              >
                <CommandPaletteIcon
                  name={command.icon}
                  danger={command.danger}
                />
                <span className="min-w-0 flex-1 break-words">
                  <span className="line-clamp-2" title={command.label}>
                    {command.label}
                  </span>
                  {command.detail && (
                    <span
                      className="block text-xs"
                      style={{ color: theme.palette.text.secondary }}
                    >
                      {command.detail}
                    </span>
                  )}
                  {command.disabledReason && (
                    <span
                      className="block mt-0.5 text-xs"
                      style={{ color: theme.palette.text.secondary }}
                    >
                      {command.disabledReason}
                    </span>
                  )}
                </span>
                {command.shortcut && (
                  <kbd className="shrink-0 text-xs opacity-60">
                    {command.shortcut}
                  </kbd>
                )}
              </li>
            </React.Fragment>
          ))}
          {!items.length && (
            <li
              role="status"
              className="px-3 py-6 text-sm"
              style={{ color: theme.palette.text.secondary }}
            >
              No matching {actionStore.choosingWindow ? 'windows' : 'commands'}
            </li>
          )}
        </ul>
        {actionStore.error && (
          <p role="alert" className="px-4 py-2 text-sm">
            {actionStore.error}
          </p>
        )}
        <div
          className="flex items-center justify-between gap-2 border-t px-4 py-2 text-xs"
          style={{
            borderColor: theme.palette.divider,
            color: theme.palette.text.secondary,
          }}
        >
          <span>
            {actionStore.busy ? 'Working…' : '↑ ↓ navigate · Enter run'}
          </span>
          <span>Esc {actionStore.choosingWindow ? 'back' : 'close'}</span>
        </div>
      </div>
    </Dialog>
  )
})

export default observer(function CommandPalette() {
  const { actionStore } = useStore()
  return actionStore.paletteOpen ? <PaletteDialog /> : null
})
