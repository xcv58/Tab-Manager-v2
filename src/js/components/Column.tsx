import React from 'react'
import { observer } from 'mobx-react-lite'
import Window from 'components/Window'

export default observer(props => {
  const {
    column: { windows },
    left,
    right,
    width,
    getScrollbars,
    dragPreview
  } = props

  const style = {
    width,
    minWidth: '20rem',
    height: 'fit-content',
    padding: 0,
    boxSizing: 'border-box',
    marginLeft: left && 'auto',
    marginRight: right && 'auto'
  }
  const windowList = windows.map(win => (
    <Window
      key={win.id}
      win={win}
      width={width}
      getScrollbars={getScrollbars}
      dragPreview={dragPreview}
    />
  ))
  return <div style={style}>{windowList}</div>
})
