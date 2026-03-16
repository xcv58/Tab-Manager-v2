import React, { useLayoutEffect, useRef } from 'react'
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
  const onResize = () => {
    if (!scrollbarRef.current) {
      return
    }
    const { height } = scrollbarRef.current.getBoundingClientRect()
    windowStore.updateHeight(height)
  }
  const { initialLoading, windowsByColumn, visibleColumn } = windowStore

  useLayoutEffect(() => {
    setContainerRef(scrollbarRef)
    onResize()
  }, [initialLoading, setContainerRef, userStore.toolbarAutoHide])

  const resizeDetector = (
    <ReactResizeDetector
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
  const columnWidth = `calc(max(${100 / visibleColumn}%, ${userStore.tabWidth}rem))`
  const columns = windowsByColumn.map((column, columnIndex) => (
    <div
      key={`window-column-${columnIndex}`}
      data-testid={`window-column-${columnIndex}`}
      className="flex flex-col"
      style={{
        width: columnWidth,
        minWidth: `${userStore.tabWidth}rem`,
      }}
    >
      {column.map((window) => (
        <Window key={window.id} width="100%" win={window} />
      ))}
    </div>
  ))
  return (
    <div
      ref={scrollbarRef}
      data-testid="window-list-scroll-container"
      className="flex flex-row items-start flex-auto px-1 mb-0 mr-0 overflow-scroll"
    >
      {columns}
      {resizeDetector}
    </div>
  )
})
