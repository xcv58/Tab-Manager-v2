import React from 'react'
import { observer } from 'mobx-react'
import Checkbox from '@material-ui/core/Checkbox'
import IconButton from '@material-ui/core/IconButton'
import { withStyles } from '@material-ui/core/styles'

const buttonWidth = '2.5rem'
const iconWidth = '1.5rem'

const styles = () => ({
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
})

@withStyles(styles)
@observer
export default class Icon extends React.Component {
  render () {
    const { classes } = this.props
    const { focus, select, iconUrl, isSelected } = this.props.tab
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
  }
}
