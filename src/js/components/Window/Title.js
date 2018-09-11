import React from 'react'
import { inject, observer } from 'mobx-react'
import { DropTarget } from 'react-dnd'
import Preview from 'components/Preview'
import SelectAll from 'components/Window/SelectAll'
import Sort from 'components/Window/Sort'
import Divider from '@material-ui/core/Divider'
import Typography from '@material-ui/core/Typography'
import ButtonBase from '@material-ui/core/ButtonBase'
import CloseButton from 'components/CloseButton'
import { getNoun } from 'libs'
import { ItemTypes, tabDropCollect, titleTarget } from 'libs/react-dnd'
import { withStyles } from '@material-ui/core/styles'
import classNames from 'classnames'

const styles = theme => ({
  root: {
    display: 'flex',
    paddingLeft: '0.5rem',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    lineHeight: '2.5rem'
  },
  error: {
    backgroundColor: theme.palette.error.light
  },
  title: {
    flex: 1
  },
  tools: {
    lineHeight: '1rem'
  }
})

@withStyles(styles)
@inject('userStore')
@inject('dragStore')
@DropTarget(ItemTypes.TAB, titleTarget, tabDropCollect)
@observer
export default class Title extends React.Component {
  render () {
    const {
      classes,
      connectDropTarget,
      isOver,
      canDrop,
      isDragging,
      win: { tabs, onTitleClick, invisibleTabs }
    } = this.props
    const { length } = tabs
    const text = `${length} ${getNoun('tab', length)}`
    const invisibleLength = invisibleTabs.length
    const invisibleIndicator =
      invisibleLength > 0 && `/ ${invisibleLength} hidden`
    const title = (
      <Typography
        variant='headline'
        style={{
          flex: '1 1 auto',
          width: 'max-content'
        }}
      >
        {text} {invisibleIndicator}
      </Typography>
    )
    let className = classes.root
    if (isDragging && isOver && !canDrop) {
      className = classNames(className, classes.error)
    }
    const preview = canDrop && isOver && <Preview />
    return connectDropTarget(
      <div>
        <div className={className}>
          <ButtonBase
            focusRipple
            component='div'
            className={classes.title}
            onClick={onTitleClick}
          >
            {title}
          </ButtonBase>
          <div className={classes.tools}>
            <SelectAll {...this.props} />
            <Sort {...this.props} />
            <CloseButton onClick={this.props.win.remove} />
          </div>
        </div>
        <Divider />
        {preview}
      </div>
    )
  }
}
