import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useAppTheme } from 'libs/appTheme'
import Toolbar from './Toolbar'
import ToolbarIndicator from './ToolbarIndicator'
import { useStore } from 'components/hooks/useStore'
import { getUiColorTokens } from 'libs/uiColorTokens'

export default observer(() => {
  const theme = useAppTheme()
  const { userStore, tabStore } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const uiColors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  const isClassicUi = userStore.uiPreset === 'classic'

  const { lazyHideToolbar, showToolbar, toolbarVisible } = userStore
  const pinned =
    tabStore.selection.size > 0 || menuOpen || !userStore.toolbarAutoHide
  const visible = toolbarVisible || pinned
  return (
    <div
      className="toolbar"
      data-increase-contrast={userStore.increaseContrast ? 'true' : 'false'}
      data-pinned={pinned ? 'true' : 'false'}
      onMouseEnter={showToolbar}
      onMouseLeave={() => {
        if (!pinned) lazyHideToolbar()
      }}
      onFocus={showToolbar}
      style={{
        display: 'flex',
        width: 'fit-content',
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 20,
        alignItems: 'stretch',
        overflow: 'hidden',
        backgroundColor: uiColors.toolbarShellBackground,
        border: isClassicUi
          ? 'none'
          : `1px solid ${uiColors.toolbarShellBorderColor}`,
        borderRadius: uiColors.toolbarShellBorderRadius,
        maxWidth: 'calc(100vw - 24px)',
      }}
    >
      {visible && <Toolbar visible={visible} onMenuOpenChange={setMenuOpen} />}
      {!pinned && <ToolbarIndicator />}
    </div>
  )
})
