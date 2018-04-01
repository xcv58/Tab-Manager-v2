import React from 'react'
import { inject, observer } from 'mobx-react'
import Window from 'components/Window'
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
  shadowScrollbars = React.createRef()

  getScrollbars = () => this.shadowScrollbars.current

  render () {
    const { windowStore: { windows } } = this.props
    const winList = windows.map((win, i) => (
      <Window
        key={win.id}
        left={i === 0}
        right={i + 1 === windows.length}
        win={win}
        getScrollbars={this.getScrollbars}
        dragPreview={() => this.dragPreview}
      />
    ))
    return (
      <ShadowScrollbars
        renderView={View}
        ref={this.shadowScrollbars}
        style={{
          display: 'flex',
          flex: '1 1 auto',
          height: 'fit-content'
        }}>
        {winList}
      </ShadowScrollbars>
    )
  }
}
