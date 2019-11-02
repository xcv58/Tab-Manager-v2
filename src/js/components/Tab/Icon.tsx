import React from 'react'
import { observer } from 'mobx-react'
import Checkbox from '@material-ui/core/Checkbox'
import IconButton from '@material-ui/core/IconButton'
import { makeStyles } from '@material-ui/core'

const buttonWidth = '39px'
const iconWidth = '1.5rem'

const useStyles = makeStyles(() => ({
  root: {
    '&:hover $icon': {
      display: 'none'
    },
    '&:hover $checkbox': {
      display: 'flex'
    }
  },
  icon: {
    width: buttonWidth,
    height: buttonWidth
  },
  img: {
    width: iconWidth,
    height: iconWidth
  },
  checkbox: {
    display: 'none'
  }
}))

export default observer(props => {
  const classes = useStyles(props)
  const { focus, select, iconUrl, isSelected } = props.tab
  return (
    <div className={classes.root}>
      <IconButton className={classes.icon} onClick={select} onFocus={focus}>
        <img className={classes.img} src={iconUrl} />
      </IconButton>
      <Checkbox
        className={classes.checkbox}
        color='primary'
        checked={isSelected}
        onChange={select}
      />
    </div>
  )
})
