import React from 'react'
import { inject, observer } from 'mobx-react'
import Column from 'components/Window/Column'
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
      windowStore: { columns }
    } = this.props
    const width = 100 / Math.min(4, columns.length) + '%'
    const winList = columns.map((column, i) => (
      <Column
        key={i}
        left={i === 0}
        right={i + 1 === columns.length}
        column={column}
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
