import React, { useRef } from 'react'
import { observer } from 'mobx-react'
import Column from 'components/Column'
import Scrollbar from 'libs/Scrollbar'
import ReactResizeDetector from 'react-resize-detector'
import Loading from './Loading'
import { useStore } from './StoreContext'

const View = (props) => {
  const { style } = props
  return (
    <div {...props} className='flex mb-0 mr-0 overflow-auto' style={style} />
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
  const { columns, initialLoading } = windowStore
  if (initialLoading) {
    return (
      <div ref={scrollbarRef}>
        <Loading />
        {resizeDetector}
      </div>
    )
  }
  const width = 100 / Math.min(4, columns.length) + '%'
  const list = columns.map((column, i) => (
    <Column
      key={i}
      left={i === 0}
      right={i + 1 === columns.length}
      column={column}
      width={width}
    />
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
