import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@material-ui/core/Tooltip'
import { useStore } from 'components/StoreContext'

export default observer(props => {
  const { hoverStore, dragStore } = useStore()
  const {
    children,
    faked,
    tab: { title, url, isHovered, urlCount }
  } = props
  const { dragging } = dragStore
  const { hovered } = hoverStore
  if (faked || dragging || !isHovered || !hovered) {
    return children
  }
  const tooltip = (
    <div
      style={{
        fontSize: '1rem',
        lineHeight: '1.2rem',
        userSelect: 'text',
        whiteSpace: 'normal',
        wordBreak: 'break-all',
        wordWrap: 'break-word',
        maxWidth: '90vw'
      }}
    >
      {urlCount > 1 && <p>There is duplicated tab!</p>}
      <p>{title}</p>
      <p>{url}</p>
    </div>
  )
  return (
    <Tooltip open title={tooltip}>
      {children}
    </Tooltip>
  )
})
