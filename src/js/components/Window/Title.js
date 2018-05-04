import React from 'react'
import { inject, observer } from 'mobx-react'
import { DropTarget } from 'react-dnd'
import Preview from 'components/Preview'
import SelectAll from './SelectAll'
import Sort from './Sort'
import { getNoun } from 'libs'
import { ItemTypes, collect } from 'libs/react-dnd'
import { withTheme } from 'material-ui/styles'

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

@withTheme()
@inject('dragStore')
@DropTarget(
  ItemTypes.TAB,
  {
    canDrop (props, monitor) {
      return props.win.canDrop
    },
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
  collect
)
@observer
export default class Title extends React.Component {
  render () {
    const {
      connectDropTarget,
      isOver,
      canDrop,
      isDragging,
      theme,
      win: { tabs }
    } = this.props
    const { length } = tabs
    const text = `${length} ${getNoun('tab', length)}`
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
    let backgroundColor = 'unset'
    if (isDragging && isOver && !canDrop) {
      backgroundColor = theme.palette.error.light
    }
    const preview = canDrop && isOver && <Preview />
    return connectDropTarget(
      <div>
        <div style={{ ...style, backgroundColor }}>
          {title}
          <SelectAll {...this.props} />
          <Sort {...this.props} />
        </div>
        {preview}
      </div>
    )
  }
}
