import React from 'react'
import { observer } from 'mobx-react'
import DragHandle from 'components/Tab/DragHandle'
import TabMenu from 'components/Tab/TabMenu'
import { withStyles } from '@material-ui/core/styles'
import { useStore } from 'components/StoreContext'

const styles = () => ({
  root: {
    display: 'flex',
    justifySelf: 'flex-end'
  }
})

const TabTools = observer(props => {
  const { dragStore } = useStore()
  const {
    classes,
    faked,
    tab: { isHovered }
  } = props
  const { dragging } = dragStore
  if (faked || dragging || !isHovered) {
    return null
  }
  return (
    <div className={classes.root}>
      <DragHandle {...props} />
      <TabMenu {...props} />
    </div>
  )
})

export default withStyles(styles)(TabTools)
