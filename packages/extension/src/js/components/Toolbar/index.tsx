import React from 'react'
import { observer } from 'mobx-react-lite'
import { useAppTheme } from 'libs/appTheme'
import Toolbar from './Toolbar'
import ToolbarIndicator from './ToolbarIndicator'
import { useStore } from 'components/hooks/useStore'
import { getUiColorTokens } from 'libs/uiColorTokens'

export default observer(() => {
  const theme = useAppTheme()
  const { userStore } = useStore()
  const uiColors = getUiColorTokens(theme.mode === 'dark', userStore.uiPreset)
  const isClassicUi = userStore.uiPreset === 'classic'

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
        backgroundColor: uiColors.toolbarShellBackground,
        border: isClassicUi
          ? 'none'
          : `1px solid ${uiColors.toolbarShellBorderColor}`,
        borderBottom: isClassicUi ? undefined : 'none',
        borderTopLeftRadius: uiColors.toolbarShellBorderRadius,
      }}
    >
      {toolbarVisible && <Toolbar />}
      <ToolbarIndicator />
    </div>
  )
})
