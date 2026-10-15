import React from 'react'
import { observer } from 'mobx-react-lite'
import Hotkeys from './Hotkeys'
import { getDescription } from 'stores/ShortcutStore'
import { useStore } from 'components/hooks/useStore'
import { useAppTheme } from 'libs/appTheme'
import { matchesShortcutSearch } from 'libs/shortcutLabel'

export default observer((props: { search: string }) => {
  const { search } = props
  const theme = useAppTheme()
  const { shortcutStore } = useStore()
  const { shortcuts } = shortcutStore

  const content = shortcuts
    .filter(
      ([keys, _, description]) =>
        getDescription(description).toLowerCase().includes(search) ||
        matchesShortcutSearch(keys, search),
    )
    .map(([keys, _, description], i) => {
      const action = shortcutStore.getHelpAction?.(keys)
      const label = getDescription(description)
      return (
        <tr key={i}>
          <td
            style={{
              padding: '8px 16px',
              verticalAlign: 'top',
              borderBottom: '1px solid var(--table-border, rgba(0,0,0,0.12))',
            }}
          >
            {label}
            {action && (
              <div className="mt-1 text-xs opacity-70">
                {action.disabledReason || action.label}
              </div>
            )}
          </td>
          <Hotkeys keys={keys} />
          <td className="shortcut-run-cell">
            {action && (
              <button
                type="button"
                disabled={!!action.disabledReason}
                aria-label={'Run: ' + action.label}
                title={action.disabledReason || action.label}
                className="shortcut-run-button"
                style={
                  action.danger
                    ? {
                        color:
                          theme.mode === 'dark'
                            ? theme.palette.danger.hoverColor
                            : theme.palette.danger.activeColor,
                      }
                    : undefined
                }
                onClick={() => void shortcutStore.runHelpAction(keys)}
              >
                Run
              </button>
            )}
          </td>
        </tr>
      )
    })
  if (!content.length) {
    return (
      <div
        role="alert"
        style={{
          padding: '6px 16px',
          borderRadius: 4,
          backgroundColor: 'var(--alert-error-bg, #fdeded)',
          color: 'var(--alert-error-text, #5f2120)',
          fontSize: '0.875rem',
        }}
      >
        No shortcut found
      </div>
    )
  }
  return (
    <>
      {shortcutStore.helpContext && (
        <p className="mb-3 text-sm" data-testid="shortcut-help-context">
          {shortcutStore.helpContext}
        </p>
      )}
      <p className="mb-4 text-sm">
        To move tabs, select them, focus the destination tab or window, then use
        a move shortcut. Vim keys are pressed in sequence; uppercase means
        Shift.
      </p>
      <table
        className="shortcut-help-table"
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1rem' }}
      >
        <thead className="text-xs">
          <tr>
            <th
              style={{
                padding: '8px 16px',
                textAlign: 'left',
                fontWeight: 600,
                width: '48%',
                borderBottom: '2px solid var(--table-border, rgba(0,0,0,0.12))',
              }}
            >
              Action
            </th>
            <th
              style={{
                padding: '8px 16px',
                textAlign: 'left',
                fontWeight: 600,
                borderBottom: '2px solid var(--table-border, rgba(0,0,0,0.12))',
              }}
            >
              Hotkey(s)
            </th>
            <th className="shortcut-run-cell whitespace-nowrap">Run action</th>
          </tr>
        </thead>
        <tbody>{content}</tbody>
      </table>
    </>
  )
})
