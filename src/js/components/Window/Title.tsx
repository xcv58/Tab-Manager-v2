import React from 'react'
import { observer } from 'mobx-react'
import { useDrop } from 'react-dnd'
import Preview from 'components/Preview'
import SelectAll from 'components/Window/SelectAll'
import Sort from 'components/Window/Sort'
import Divider from '@material-ui/core/Divider'
import Typography from '@material-ui/core/Typography'
import ButtonBase from '@material-ui/core/ButtonBase'
import CloseButton from 'components/CloseButton'
import { getNoun } from 'libs'
import { ItemTypes, getTargetTab } from 'libs/react-dnd'
import { withStyles } from '@material-ui/core/styles'
import classNames from 'classnames'
import Reload from './Reload'
import { useStore } from 'components/StoreContext'

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

const Title = observer(props => {
  const { classes, win } = props
  const { dragStore } = useStore()
  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    canDrop: () => win.canDrop,
    drop: (_, monitor) => {
      if (monitor.didDrop()) {
        return
      }
      const tab = getTargetTab(win.tabs, true)
      if (tab) {
        dragStore.drop(tab, true)
      }
    },
    collect: monitor => {
      return {
        canDrop: monitor.canDrop(),
        isDragging: !!monitor.getItem(),
        isOver: monitor.isOver({ shallow: true })
      }
    }
  })
  const { isOver, canDrop, isDragging } = dropProps
  const { tabs, onTitleClick, invisibleTabs, reload } = win
  const { length } = tabs
  const text = `${length} ${getNoun('tab', length)}`
  const invisibleLength = invisibleTabs.length
  const invisibleIndicator =
    invisibleLength > 0 && `/ ${invisibleLength} hidden`
  const title = (
    <Typography
      variant='h5'
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
  return (
    <div ref={drop}>
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
          <SelectAll {...props} />
          <Sort {...props} />
          <Reload {...{ reload }} />
          <CloseButton onClick={props.win.close} />
        </div>
      </div>
      <Divider />
      {preview}
    </div>
  )
})

export default withStyles(styles)(Title)
