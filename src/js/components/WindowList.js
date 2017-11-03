import React from 'react'
import { inject, observer } from 'mobx-react'
import Window from 'components/Window'
import DragPreview from 'components/DragPreview'
import ShadowScrollbars from 'libs/ShadowScrollbars'

const View = (props) => {
  const { style } = props
  return (
    <div {...props}
      style={{
        ...style,
        display: 'flex'
      }}
    />
  )
}

@inject('windowStore')
@observer
export default class WindowList extends React.Component {
  render () {
    const { windowStore: { windows, width } } = this.props
    const winList = windows.map((win) => (
      <Window
        key={win.id}
        win={win}
        width={width}
        getWindowList={() => this}
        dragPreview={() => this.dragPreview}
      />
    ))
    return (
      <ShadowScrollbars
        renderView={View}
        ref='shadowScrollbars'
        style={{
          display: 'flex',
          flex: '1 1 auto',
          height: 'fit-content'
        }}>
        <DragPreview
          setDragPreview={(dragPreview) => { this.dragPreview = dragPreview }}
        />
        {winList}
      </ShadowScrollbars>
    )
  }
}
