import React from 'react'
import { observer } from 'mobx-react-lite'
import { useTheme } from '@mui/material/styles'
import Toolbar from './Toolbar'
import ToolbarIndicator from './ToolbarIndicator'
import { useStore } from 'components/hooks/useStore'

type Props = {
  isPopup?: boolean
}

export default observer(({ isPopup = false }: Props) => {
  const theme = useTheme()
  const { userStore } = useStore()

  const { lazyHideToolbar, showToolbar, toolbarVisible } = userStore
  return (
    <div
      className="toolbar"
      onMouseEnter={showToolbar}
      onMouseLeave={lazyHideToolbar}
      style={{
        display: 'flex',
        width: 'fit-content',
        position: 'fixed',
        bottom: 0,
        right: 0,
        alignItems: 'stretch',
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderBottom: 'none',
        borderTopLeftRadius: 16,
      }}
    >
      {toolbarVisible && <Toolbar isPopup={isPopup} />}
      <ToolbarIndicator />
    </div>
  )
})
