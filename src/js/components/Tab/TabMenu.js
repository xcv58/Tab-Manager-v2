import React from 'react'
import { inject, observer } from 'mobx-react'
import IconButton from 'material-ui/IconButton'
import { MenuItem } from 'material-ui/Menu'
import Divider from 'material-ui/Divider'
import Popover from 'material-ui/Popover'
import MoreVertIcon from '@material-ui/icons/MoreVert'
import { backgroundColor } from 'libs/colors'
import { getNoun } from 'libs'
import { withStyles } from 'material-ui/styles'

const style = theme => ({
  menu: {
    zIndex: theme.zIndex.tooltip + 1
  }
})

const DIVIDER = { divider: true }

@withStyles(style)
@inject('dragStore')
@observer
export default class TabMenu extends React.Component {
  state = {
    anchorEl: null
  }

  handleClick = event => {
    this.setState({ anchorEl: event.currentTarget })
  }

  handleClose = () => {
    this.setState({ anchorEl: null })
  }

  getOnClick = func => () => {
    this.handleClose()
    func()
  }

  getOptions = () => {
    const {
      remove,
      groupTab,
      sameDomainTabs,
      pinned,
      togglePin
    } = this.props.tab
    const otherDomains = sameDomainTabs.length - 1
    const options = []
    if (otherDomains > 0) {
      options.push(
        {
          label: `Group ${otherDomains} same domain ${getNoun(
            'tab',
            otherDomains
          )} to the left/top most`,
          onClick: groupTab
        },
        DIVIDER
      )
    }
    options.push(
      {
        label: pinned ? 'Unpin Tab' : 'Pin Tab',
        onClick: togglePin
      },
      {
        label: 'Remove',
        onClick: remove
      }
    )
    return options
  }

  render () {
    const { classes } = this.props
    const { anchorEl } = this.state

    const options = this.getOptions().map(({ onClick, ...option }) => ({
      ...option,
      onClick: this.getOnClick(onClick)
    }))
    const content = options.map(
      ({ label, onClick, disabled = false, divider }, i) =>
        divider ? (
          <Divider key={i} />
        ) : (
          <MenuItem key={label} disabled={disabled} onClick={onClick}>
            {label}
          </MenuItem>
        )
    )
    return (
      <div>
        <IconButton style={{ backgroundColor }} onClick={this.handleClick}>
          <MoreVertIcon />
        </IconButton>
        <Popover
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left'
          }}
          onClose={this.handleClose}
          className={classes.menu}
          PaperProps={{
            style: {
              minWidth: 200
            }
          }}
        >
          {content}
        </Popover>
      </div>
    )
  }
}
