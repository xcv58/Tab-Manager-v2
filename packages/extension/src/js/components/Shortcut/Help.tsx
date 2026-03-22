import React from 'react'
import { observer } from 'mobx-react-lite'
import Hotkeys from './Hotkeys'
import { getDescription } from 'stores/ShortcutStore'
import { useStore } from 'components/hooks/useStore'

const keysSearch = (keys: string | string[], search: string) => {
  if (typeof keys === 'string') {
    return keys.includes(search)
  }
  return keys.join('').includes(search)
}

export default observer((props: { search: string }) => {
  const { search } = props
  const { shortcutStore } = useStore()
  const { shortcuts } = shortcutStore

  const content = shortcuts
    .filter(
      ([keys, _, description]) =>
        getDescription(description).toLowerCase().includes(search) ||
        keysSearch(keys, search),
    )
    .map(([keys, _, description], i) => (
      <tr key={i}>
        <td
          style={{
            padding: '8px 16px',
            borderBottom: '1px solid var(--table-border, rgba(0,0,0,0.12))',
          }}
        >
          {getDescription(description)}
        </td>
        <Hotkeys keys={keys} />
      </tr>
    ))
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
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th
            style={{
              padding: '8px 16px',
              textAlign: 'left',
              fontWeight: 600,
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
        </tr>
      </thead>
      <tbody>{content}</tbody>
    </table>
  )
})
