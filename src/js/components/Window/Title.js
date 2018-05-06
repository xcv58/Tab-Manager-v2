import React from 'react'
import { inject, observer } from 'mobx-react'
import { DropTarget } from 'react-dnd'
import Preview from 'components/Preview'
import SelectAll from './SelectAll'
import Sort from './Sort'
import { getNoun } from 'libs'
import { ItemTypes, tabDropCollect, titleTarget } from 'libs/react-dnd'
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
@inject('userStore')
@inject('dragStore')
@DropTarget(ItemTypes.TAB, titleTarget, tabDropCollect)
@observer
export default class Title extends React.Component {
  render () {
    const {
      connectDropTarget,
      isOver,
      canDrop,
      isDragging,
      theme,
      win: { tabs, onTitleClick, invisibleTabs }
    } = this.props
    const { length } = tabs
    const text = `${length} ${getNoun('tab', length)}`
    const invisibleLength = invisibleTabs.length
    const invisibleIndicator =
      invisibleLength > 0 && `/ ${invisibleLength} hidden`
    const title = (
      <span
        style={{
          flex: '1 1 auto',
          width: 'max-content'
        }}
      >
        {text} {invisibleIndicator}
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
          <div onClick={onTitleClick}>{title}</div>
          <div>
            <SelectAll {...this.props} />
            <Sort {...this.props} />
          </div>
        </div>
        {preview}
      </div>
    )
  }
}
