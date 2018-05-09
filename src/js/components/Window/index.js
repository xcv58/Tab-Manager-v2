import React from 'react'
import { inject, observer } from 'mobx-react'
import { DropTarget } from 'react-dnd'
import Paper from 'material-ui/Paper'
import Title from './Title'
import Tabs from './Tabs'
import Preview from 'components/Preview'
import { ItemTypes, tabDropCollect, windowTarget } from 'libs/react-dnd'
import { withTheme } from 'material-ui/styles'

@withTheme()
@inject('windowStore')
@inject('dragStore')
@DropTarget(ItemTypes.TAB, windowTarget, tabDropCollect)
@observer
export default class Window extends React.Component {
  render () {
    const {
      connectDropTarget,
      isOver,
      isDragging,
      canDrop,
      theme,
      win: { lastFocused, showTabs }
    } = this.props

    const style = {
      width: '100%',
      minWidth: '20rem',
      height: 'fit-content',
      padding: '2px 2px 32px 2px',
      boxSizing: 'border-box'
    }
    if (isDragging && isOver && !canDrop) {
      style.backgroundColor = theme.palette.error.light
    }
    const dropIndicator = canDrop && isOver && <Preview />
    const elevation = lastFocused ? 16 : 2
    return connectDropTarget(
      <div style={style}>
        <Paper elevation={elevation}>
          <Title {...this.props} />
          {showTabs && <Tabs {...this.props} />}
          {dropIndicator}
        </Paper>
      </div>
    )
  }
}
