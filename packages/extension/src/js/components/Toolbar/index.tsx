import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { useAppTheme } from 'libs/appTheme'
import Toolbar from './Toolbar'
import ToolbarIndicator from './ToolbarIndicator'
import { useStore } from 'components/hooks/useStore'
import { getUiColorTokens } from 'libs/uiColorTokens'
import SelectionToolbar from './SelectionToolbar'

export default observer(() => {
  const theme = useAppTheme()
  const { userStore, tabStore, dragStore, actionStore } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const pointerInside = useRef(false)
  const previouslySelected = useRef(false)
  const lastFocusRequest = useRef(0)
  const uiColors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  const isClassicUi = userStore.uiPreset === 'classic'

  const { lazyHideToolbar, showToolbar, toolbarVisible } = userStore
  const hasSelection = tabStore.selection.size > 0
  const selectionExpanded = actionStore.selectionPaletteOpen
  const selectionVisible =
    hasSelection ||
    (selectionExpanded && (actionStore.busy || !!actionStore.error))
  const active = selectionVisible || menuOpen
  const pinned = active || !userStore.toolbarAutoHide
  const visible = toolbarVisible || pinned
  const dragging = dragStore.dragging
  useLayoutEffect(() => {
    // A new selection opens the palette. Count changes and drags preserve the
    // user's choice to collapse it for the rest of this selection session.
    if (hasSelection && !previouslySelected.current)
      actionStore.openSelectionPalette()
    if (!hasSelection && !actionStore.busy && !actionStore.error)
      actionStore.closeSelectionPalette()
    previouslySelected.current = hasSelection
  }, [hasSelection, actionStore, actionStore.busy, actionStore.error])
  useLayoutEffect(() => {
    if (lastFocusRequest.current === actionStore.toolbarFocusRequest) return
    lastFocusRequest.current = actionStore.toolbarFocusRequest
    const target = toolbarRef.current?.querySelector<HTMLElement>(
      selectionExpanded
        ? '[data-selection-action-search]'
        : '[data-toolbar-base] button:not(:disabled), [data-toolbar-base] input:not(:disabled)',
    )
    const caller = actionStore.toolbarFocusTarget
    const frame = requestAnimationFrame(() => {
      if (!target?.isConnected) return
      runInAction(() => {
        target.focus({ preventScroll: true })
        // Search blur can briefly focus a tab. Its focus-entry event must not
        // replace the original caller of this explicit toolbar request.
        actionStore.toolbarFocusTarget = caller
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [actionStore.toolbarFocusRequest, selectionExpanded])
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
      data-active={active ? 'true' : 'false'}
      onKeyDown={(event) => {
        if (!selectionVisible && event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
      onKeyUp={(event) => {
        if (!selectionVisible && event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          const caller = actionStore.toolbarFocusTarget
          if (caller?.isConnected && !toolbarRef.current?.contains(caller))
            caller.focus({ preventScroll: true })
        }
      }}
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
        maxWidth: '100vw',
      }}
    >
      <div
        className="selection-toolbar corner-dock"
        style={{
          display: selectionVisible ? undefined : 'none',
          position: 'absolute',
          bottom: '100%',
          right: 0,
          width: '100%',
          maxWidth: '100vw',
          maxHeight: 'calc(100dvh - 100%)',
          overflowY: 'auto',
          boxSizing: 'border-box',
          backgroundColor: uiColors.toolbarShellBackground,
          border: `1px solid ${uiColors.toolbarShellBorderColor}`,
          borderRight: 'none',
          borderBottom: 'none',
          borderTopLeftRadius: uiColors.toolbarShellBorderRadius,
        }}
      >
        <SelectionToolbar />
      </div>
      <div
        className="corner-dock flex items-stretch"
        style={{
          minWidth: 0,
          maxWidth: '100vw',
          overflow: 'hidden',
          backgroundColor: uiColors.toolbarShellBackground,
          border: isClassicUi
            ? 'none'
            : `1px solid ${uiColors.toolbarShellBorderColor}`,
          borderRight: 'none',
          borderBottom: 'none',
          borderTopLeftRadius: selectionVisible
            ? 0
            : uiColors.toolbarShellBorderRadius,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >
        {visible && (
          <Toolbar visible={visible} onMenuOpenChange={setMenuOpen} />
        )}
        {userStore.toolbarAutoHide && <ToolbarIndicator heldOpen={active} />}
      </div>
    </div>
  )
})
