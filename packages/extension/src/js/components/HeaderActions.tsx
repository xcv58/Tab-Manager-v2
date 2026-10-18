import React, { useLayoutEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from './hooks/useStore'
import LayoutRepackIndicator from './LayoutRepackIndicator'
import OpenInTab from './OpenInTab'
import SyncButton from './SyncButton'
import ThemeToggle from './ThemeToggle'

export default observer(function HeaderActions() {
  const { windowStore } = useStore()
  const needsRelayout =
    windowStore.layoutDirty || windowStore.windowLastUsedLayoutDirty
  const [showRelayout, setShowRelayout] = useState(needsRelayout)
  const [pointerWithin, setPointerWithin] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)

  // Keep controls stable while the pointer or keyboard focus is inside them.
  // Both arrangements occupy the same width, including while a swap is deferred.
  useLayoutEffect(() => {
    if (!pointerWithin && !focusWithin) setShowRelayout(needsRelayout)
  }, [needsRelayout, pointerWithin, focusWithin])

  return (
    <div
      className="search-header-actions"
      data-testid="search-header-actions"
      data-layout-pending={showRelayout}
      onPointerEnter={() => setPointerWithin(true)}
      onPointerLeave={() => setPointerWithin(false)}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setFocusWithin(false)
      }}
    >
      {showRelayout ? (
        <LayoutRepackIndicator enabled={needsRelayout} />
      ) : (
        <>
          <SyncButton />
          <ThemeToggle />
          <OpenInTab />
        </>
      )}
    </div>
  )
})
