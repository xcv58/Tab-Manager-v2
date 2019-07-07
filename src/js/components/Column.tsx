import React from 'react'
import { observer } from 'mobx-react'
import Window from 'components/Window'
import FlipMove from 'react-flip-move'

export default observer(props => {
  const {
    column: { windows },
    left,
    right,
    width,
    getScrollbars
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
    <div key={win.id}>
      <Window win={win} width={width} getScrollbars={getScrollbars} />
    </div>
  ))
  return (
    <FlipMove
      duration={255}
      easing='ease-in-out'
      enterAnimation='accordionVertical'
      leaveAnimation='accordionVertical'
      style={style}
    >
      {windowList}
    </FlipMove>
  )
})
