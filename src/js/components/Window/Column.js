import React from 'react'
import { observer } from 'mobx-react'
import Window from './index'

@observer
export default class Column extends React.Component {
  render () {
    const {
      column: { windows },
      left,
      right,
      width,
      getScrollbars,
      dragPreview
    } = this.props

    const style = {
      width,
      minWidth: '20rem',
      height: 'fit-content',
      padding: '0 1px 3rem 0',
      boxSizing: 'border-box',
      marginLeft: left && 'auto',
      marginRight: right && 'auto'
    }
    console.log('Column: ', windows.length)
    const w = windows.map(win => (
      <Window
        key={win.id}
        win={win}
        width={width}
        getScrollbars={getScrollbars}
        dragPreview={dragPreview}
      />
    ))
    return <div style={style}>{w}</div>
  }
}
