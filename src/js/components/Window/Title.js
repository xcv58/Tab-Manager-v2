import React from 'react'
import { inject, observer } from 'mobx-react'
import { DropTarget } from 'react-dnd'
import Preview from 'components/Preview'
import SelectAll from './SelectAll'
import Sort from './Sort'
import { ItemTypes } from 'libs'

const style = {
  display: 'flex',
  paddingLeft: '0.5rem',
  paddingRight: 4,
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '1.5rem',
  fontWeight: 'bold',
  lineHeight: '2.5rem'
}

@inject('dragStore')
@DropTarget(
  ItemTypes.TAB,
  {
    drop (props, monitor) {
      if (monitor.didDrop()) {
        return
      }
      const {
        win: { tabs },
        dragStore: { drop }
      } = props
      const tab = tabs[0]
      drop(tab, true)
    }
  },
  (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver()
  })
)
@observer
export default class Title extends React.Component {
  render () {
    const {
      connectDropTarget,
      isOver,
      win: { tabs }
    } = this.props
    const { length } = tabs
    const text = `${length} tab` + (length > 1 ? 's' : '')
    const title = (
      <span
        style={{
          flex: '1 1 auto',
          width: 'max-content'
        }}
      >
        {text}
      </span>
    )
    const preview = isOver && <Preview />
    return connectDropTarget(
      <div>
        <div style={style}>
          {title}
          <SelectAll {...this.props} />
          <Sort {...this.props} />
        </div>
        {preview}
      </div>
    )
  }
}
