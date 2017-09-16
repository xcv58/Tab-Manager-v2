import React from 'react'
import { inject, observer } from 'mobx-react'
import Window from './Window'
import DragPreview from './DragPreview'
import ShadowScrollbars from '../libs/ShadowScrollbars'

const width = '800px'

@inject('windowStore')
@observer
export default class App extends React.Component {
  resize = () => {
    const bottom = Math.max(
      ...Object.values(this.refs).map(
        x => x.getBoundingClientRect().bottom
      )
    )
    const height = `${Math.max(bottom, 300)}px`
    document.getElementsByTagName('html')[0].style.height = height
    document.getElementsByTagName('html')[0].style.width = width
    document.body.style.height = height
    document.body.style.width = width
  }

  componentDidUpdate = this.resize
  componentDidMount = this.resize

  render () {
    const { windowStore: { windows } } = this.props
    const winList = windows.map((win) => (
      <Window
        key={win.id}
        ref={win.id}
        getWindowList={() => this}
        dragPreview={() => this.dragPreview}
        {...win}
      />
    ))
    return (
      <ShadowScrollbars
        ref={(el) => { this.shadowScrollbars = el || this.shadowScrollbars }}
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
