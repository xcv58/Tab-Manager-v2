import React, { useEffect, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useAppTheme } from 'libs/appTheme'
import Toolbar from './Toolbar'
import ToolbarIndicator from './ToolbarIndicator'
import { useStore } from 'components/hooks/useStore'
import { getUiColorTokens } from 'libs/uiColorTokens'

export default observer(() => {
  const theme = useAppTheme()
  const { userStore, tabStore, dragStore } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const pointerInside = useRef(false)
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
  const dragging = dragStore.dragging
  useEffect(() => {
    if (dragging) pointerInside.current = false
    // A menu or selection can end after the pointer has already left the dock.
    if (
      !pinned &&
      !dragging &&
      !pointerInside.current &&
      !toolbarRef.current?.contains(document.activeElement)
    )
      lazyHideToolbar()
  }, [pinned, dragging, lazyHideToolbar])
  if (dragging) return null
  return (
    <div
      className="toolbar corner-dock"
      ref={toolbarRef}
      data-increase-contrast={userStore.increaseContrast ? 'true' : 'false'}
      data-pinned={pinned ? 'true' : 'false'}
      onMouseEnter={() => {
        pointerInside.current = true
        showToolbar()
      }}
      onMouseLeave={() => {
        pointerInside.current = false
        if (!pinned && !toolbarRef.current?.contains(document.activeElement))
          lazyHideToolbar()
      }}
      onFocus={showToolbar}
      onBlur={(event) => {
        if (
          !pinned &&
          !pointerInside.current &&
          !event.currentTarget.contains(event.relatedTarget as Node | null)
        )
          lazyHideToolbar()
      }}
      style={{
        display: 'flex',
        width: 'fit-content',
        position: 'fixed',
        bottom: 0,
        right: 0,
        zIndex: 20,
        alignItems: 'stretch',
        overflow: 'hidden',
        backgroundColor: uiColors.toolbarShellBackground,
        border: isClassicUi
          ? 'none'
          : `1px solid ${uiColors.toolbarShellBorderColor}`,
        borderRight: 'none',
        borderBottom: 'none',
        borderTopLeftRadius: uiColors.toolbarShellBorderRadius,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        maxWidth: '100vw',
      }}
    >
      {visible && <Toolbar visible={visible} onMenuOpenChange={setMenuOpen} />}
      {!pinned && <ToolbarIndicator />}
    </div>
  )
})
