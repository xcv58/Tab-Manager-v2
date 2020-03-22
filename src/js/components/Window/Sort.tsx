import React from 'react'
import { observer } from 'mobx-react'
import Tooltip from '@material-ui/core/Tooltip'
import SortIcon from '@material-ui/icons/Sort'
import IconButton from '@material-ui/core/IconButton'
import { useStore } from 'components/StoreContext'

export default observer((props) => {
  const { arrangeStore } = useStore()
  const {
    win: { id }
  } = props
  const { sortTabs } = arrangeStore
  return (
    <Tooltip title='Sort tabs'>
      <IconButton onClick={() => sortTabs(id)} className='focus:outline-none'>
        <SortIcon />
      </IconButton>
    </Tooltip>
  )
})
