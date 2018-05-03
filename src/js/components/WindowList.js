import React from 'react'
import { inject, observer } from 'mobx-react'
import Window from 'components/Window'
import Scrollbars from 'libs/Scrollbars'

const View = props => {
  const { style } = props
  return (
    <div
      {...props}
      className='scrollbar'
      style={{
        ...style,
        display: 'flex',
        overflow: 'auto'
      }}
    />
  )
}

@inject('windowStore')
@observer
export default class WindowList extends React.Component {
  scrollbars = React.createRef()

  getScrollbars = () => this.scrollbars.current

  render () {
    const {
      windowStore: { windows }
    } = this.props
    const width = 100 / Math.min(4, windows.length) + '%'
    const winList = windows.map((win, i) => (
      <Window
        key={win.id}
        left={i === 0}
        right={i + 1 === windows.length}
        win={win}
        width={width}
        getScrollbars={this.getScrollbars}
        dragPreview={() => this.dragPreview}
      />
    ))
    return (
      <Scrollbars
        renderView={View}
        ref={this.scrollbars}
        style={{
          display: 'flex',
          flex: '1 1 auto',
          height: 'fit-content'
        }}
      >
        {winList}
      </Scrollbars>
    )
  }
}
