import React from 'react'
import { observer } from 'mobx-react'
import DragHandle from 'components/Tab/DragHandle'
import TabMenu from 'components/Tab/TabMenu'
import { makeStyles } from '@material-ui/core'
import { useStore } from 'components/StoreContext'

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    justifySelf: 'flex-end'
  }
}))

export default observer(props => {
  const { dragStore } = useStore()
  const classes = useStyles(props)
  const {
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
