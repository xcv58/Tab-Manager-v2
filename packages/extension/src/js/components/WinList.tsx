import React, { useCallback, useLayoutEffect, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import ReactResizeDetector from 'react-resize-detector'
import Loading from './Loading'
import { useStore } from './hooks/useStore'
import Window from './Window'

export default observer(() => {
  const {
    windowStore,
    userStore,
    focusStore: { setContainerRef },
  } = useStore()
  const scrollbarRef = useRef<HTMLDivElement | null>(null)
  const onResize = useCallback(() => {
    if (!scrollbarRef.current) {
      return
    }
    const styles = window.getComputedStyle(scrollbarRef.current)
    const paddingX =
      parseFloat(styles.paddingLeft || '0') +
      parseFloat(styles.paddingRight || '0')
    const paddingY =
      parseFloat(styles.paddingTop || '0') +
      parseFloat(styles.paddingBottom || '0')
    const width = Math.max(scrollbarRef.current.clientWidth - paddingX, 0)
    const height = Math.max(scrollbarRef.current.clientHeight - paddingY, 0)
    windowStore.updateViewport(height, width)
    windowStore.updateScroll(
      scrollbarRef.current.scrollTop,
      scrollbarRef.current.scrollLeft,
    )
  }, [windowStore])
  const onScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      windowStore.updateScroll(
        event.currentTarget.scrollTop,
        event.currentTarget.scrollLeft,
      )
    },
    [windowStore],
  )
  const {
    initialLoading,
    visibleWindows,
    renderedColumnLayouts,
    totalContentWidth,
    totalContentHeight,
  } = windowStore
  const windowById = new Map(visibleWindows.map((win) => [win.id, win]))

  useLayoutEffect(() => {
    setContainerRef(scrollbarRef)
    onResize()
  }, [initialLoading, onResize, setContainerRef, userStore.toolbarAutoHide])

  const resizeDetector = (
    <ReactResizeDetector
      handleWidth
      handleHeight
      refreshMode="throttle"
      refreshOptions={{ leading: false, trailing: true }}
      refreshRate={64}
      onResize={onResize}
    />
  )
  if (initialLoading) {
    return (
      <div
        ref={scrollbarRef}
        className="flex items-center justify-center flex-auto overflow-hidden"
      >
        <Loading />
        {resizeDetector}
      </div>
    )
  }
  const columns = renderedColumnLayouts.map((column) => (
    <div
      key={`window-column-${column.columnIndex}`}
      data-testid={`window-column-${column.columnIndex}`}
      className="absolute top-0"
      style={{
        left: column.left,
        width: column.width,
        minWidth: `${userStore.tabWidth}rem`,
        height: column.height,
      }}
    >
      {column.renderedWindows.map((layout) => {
        const win = windowById.get(layout.windowId)
        if (!win) {
          return null
        }
        return (
          <div
            key={win.id}
            className="absolute inset-x-0"
            style={{ top: layout.top }}
          >
            <Window width="100%" win={win} />
          </div>
        )
      })}
    </div>
  ))
  return (
    <div
      ref={scrollbarRef}
      onScroll={onScroll}
      data-testid="window-list-scroll-container"
      className="relative flex-auto px-1 mb-0 mr-0 overflow-scroll"
    >
      <div
        className="relative"
        style={{
          width: totalContentWidth,
          minHeight: totalContentHeight,
        }}
      >
        {columns}
      </div>
      {resizeDetector}
    </div>
  )
})
