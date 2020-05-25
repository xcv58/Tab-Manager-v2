import React from 'react'
import { observer } from 'mobx-react-lite'
import Toolbar from './Toolbar'
import ToolbarIndicator from './ToolbarIndicator'
import { useStore } from 'components/hooks/useStore'

export default observer(() => {
  const { userStore } = useStore()

  const { lazyHideToolbar, showToolbar, toolbarVisible } = userStore
  return (
    <div
      className='toolbar'
      onMouseEnter={showToolbar}
      onMouseLeave={lazyHideToolbar}
      style={{
        display: 'flex',
        width: 'fit-content',
        position: 'fixed',
        bottom: 0,
        right: 0
      }}
    >
      {toolbarVisible && <Toolbar />}
      <ToolbarIndicator />
    </div>
  )
})
