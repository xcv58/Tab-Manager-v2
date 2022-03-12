import React, { useRef, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Scrollbar from 'libs/Scrollbar'
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

  useEffect(() => setContainerRef(scrollbarRef))

  const resizeDetector = (
    <ReactResizeDetector
      handleHeight
      refreshMode="throttle"
      refreshOptions={{ leading: true, trailing: true }}
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
    <Scrollbar scrollbarRef={scrollbarRef}>
      {list}
      {resizeDetector}
    </Scrollbar>
  )
})
