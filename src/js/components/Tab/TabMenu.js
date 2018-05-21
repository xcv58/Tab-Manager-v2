import React from 'react'
import { inject, observer } from 'mobx-react'
import IconButton from '@material-ui/core/IconButton'
import MenuItem from '@material-ui/core/MenuItem'
import Divider from '@material-ui/core/Divider'
import Popover from '@material-ui/core/Popover'
import MoreVertIcon from '@material-ui/icons/MoreVert'
import { backgroundColor } from 'libs/colors'
import { withStyles } from '@material-ui/core/styles'
import { getNoun } from 'libs'

const styles = theme => ({
  menu: {
    zIndex: theme.zIndex.tooltip + 1
  }
})

const DIVIDER = { divider: true }

@withStyles(styles)
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
      togglePin,
      urlCount,
      closeDuplicatedTab
    } = this.props.tab
    const options = [
      {
        label: pinned ? 'Unpin Tab' : 'Pin Tab',
        onClick: togglePin
      },
      {
        label: 'Remove',
        onClick: remove
      }
    ]
    if (sameDomainTabs.length > 1) {
      options.push(DIVIDER, {
        label: `Group ${sameDomainTabs.length} same domain tabs to this window`,
        onClick: groupTab
      })
    }
    if (urlCount > 1) {
      options.push(DIVIDER, {
        label: `Close other ${urlCount - 1} duplicated ${getNoun(
          'tab',
          urlCount - 1
        )}`,
        onClick: closeDuplicatedTab
      })
    }
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
