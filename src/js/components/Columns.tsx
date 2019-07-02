import React, { useRef } from 'react'
import { observer } from 'mobx-react'
import Column from 'components/Column'
import Scrollbars from 'libs/Scrollbars'
import ReactResizeDetector from 'react-resize-detector'
import Loading from './Loading'
import { useStore } from './StoreContext'

const View = props => {
  const { style } = props
  return (
    <div
      {...props}
      className='scrollbar'
      style={{
        ...style,
        display: 'flex',
        overflow: 'auto',
        marginRight: 0,
        marginBottom: 0
      }}
    />
  )
}

export default observer(() => {
  const { windowStore } = useStore()
  const scrollbars = useRef(null)
  const getScrollbars = () => scrollbars.current
  const onResize = () => {
    const { height } = getScrollbars().getBoundingClientRect()
    windowStore.updateHeight(height)
  }
  const renderEmptyTrack = props => (
    <div {...props} style={{ ...props.style, display: 'none' }} />
  )

  const { columns, initialLoading } = windowStore
  if (initialLoading) {
    return <Loading />
  }
  const width = 100 / Math.min(4, columns.length) + '%'
  const list = columns.map((column, i) => (
    <Column
      key={i}
      left={i === 0}
      right={i + 1 === columns.length}
      column={column}
      width={width}
      getScrollbars={getScrollbars}
    />
  ))
  return (
    <Scrollbars
      renderView={View}
      renderTrackHorizontal={renderEmptyTrack}
      renderTrackVertical={renderEmptyTrack}
      ref={scrollbars}
      style={{
        display: 'flex',
        flex: '1 1 auto',
        height: 'fit-content'
      }}
    >
      {list}
      <ReactResizeDetector
        handleHeight
        refreshMode='throttle'
        refreshRate={300}
        onResize={onResize}
      />
    </Scrollbars>
  )
})
