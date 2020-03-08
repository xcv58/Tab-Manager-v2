import React from 'react'
import { observer } from 'mobx-react'
import Window from 'components/Window'

export default observer(props => {
  const {
    column: { windows },
    left,
    right,
    width,
    getScrollbars
  } = props

  const style: any = {
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
    />
  ))
  return <div style={style}>{windowList}</div>
})
