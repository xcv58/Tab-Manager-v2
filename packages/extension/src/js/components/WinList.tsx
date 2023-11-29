import React, { useRef, useEffect } from 'react'
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
  const scrollbarRef = useRef(null)
  const onResize = () => {
    const { height } = scrollbarRef.current.getBoundingClientRect()
    windowStore.updateHeight(height)
  }

  useEffect(() => {
    setContainerRef(scrollbarRef)
    onResize()
  }, [])

  const resizeDetector = (
    <ReactResizeDetector
      handleHeight
      refreshMode="throttle"
      refreshOptions={{ leading: false, trailing: true }}
      refreshRate={64}
      onResize={onResize}
    />
  )
  const { initialLoading, windows, visibleColumn } = windowStore
  if (initialLoading) {
    return (
      <div ref={scrollbarRef}>
        <Loading />
        {resizeDetector}
      </div>
    )
  }
  const width = `calc(max(${100 / visibleColumn}%, ${userStore.tabWidth}rem))`
  const list = windows.map((window) => (
    <Window key={window.id} width={width} win={window} />
  ))
  return (
    <div
      ref={scrollbarRef}
      className="flex flex-col flex-wrap content-start flex-auto mb-0 mr-0 overflow-scroll border-red-700"
    >
      {list}
      {resizeDetector}
    </div>
  )
})
