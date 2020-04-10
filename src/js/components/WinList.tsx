import React, { useRef } from 'react'
import { observer } from 'mobx-react'
import Scrollbar from 'libs/Scrollbar'
import ReactResizeDetector from 'react-resize-detector'
import Loading from './Loading'
import { useStore } from './StoreContext'
import Window from './Window'

const View = (props) => {
  const { style } = props
  return (
    <div
      {...props}
      className='flex flex-col flex-wrap content-start mb-0 mr-0 overflow-hidden'
      style={{ ...style, marginRight: 0, marginBottom: 0 }}
    />
  )
}

export default observer(() => {
  const { windowStore } = useStore()
  const scrollbarRef = useRef(null)
  const onResize = () => {
    const { height } = scrollbarRef.current.getBoundingClientRect()
    windowStore.updateHeight(height)
  }
  const renderEmptyTrack = (props) => (
    <div {...props} style={{ ...props.style, display: 'none' }} />
  )

  const resizeDetector = (
    <ReactResizeDetector
      handleHeight
      refreshMode='throttle'
      refreshOptions={{ leading: true, trailing: true }}
      refreshRate={500}
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
  const width = 100 / Math.min(4, visibleColumn) + '%'
  const list = windows.map((window) => (
    <Window key={window.id} width={width} win={window} />
  ))
  return (
    <Scrollbar
      renderView={View}
      renderTrackHorizontal={renderEmptyTrack}
      renderTrackVertical={renderEmptyTrack}
      scrollbarRef={scrollbarRef}
      style={{
        display: 'flex',
        flex: '1 1 auto',
        height: 'fit-content'
      }}
    >
      {list}
      {resizeDetector}
    </Scrollbar>
  )
})
