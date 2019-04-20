import React from 'react'
import { inject, observer } from 'mobx-react'
import DragHandle from 'components/Tab/DragHandle'
import TabMenu from 'components/Tab/TabMenu'
import { withStyles } from '@material-ui/core/styles'

const styles = theme => ({
  root: {
    display: 'flex',
    justifySelf: 'flex-end'
  }
})

@withStyles(styles)
@inject('dragStore')
@observer
class TabTools extends React.Component {
  render () {
    const {
      classes,
      faked,
      dragStore: { dragging },
      tab: { isHovered }
    } = this.props
    if (faked || dragging || !isHovered) {
      return null
    }
    return (
      <div className={classes.root}>
        <DragHandle {...this.props} />
        <TabMenu {...this.props} />
      </div>
    )
  }
}

export default TabTools
