import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@material-ui/core/Tooltip'
import SortIcon from '@material-ui/icons/Sort'
import IconButton from '@material-ui/core/IconButton'
import { useStore } from 'components/hooks/useStore'
import { WinProps } from 'components/types'

export default observer((props: WinProps) => {
  const { arrangeStore } = useStore()
  const { id } = props.win
  const { sortTabs } = arrangeStore
  return (
    <Tooltip title='Sort tabs'>
      <IconButton onClick={() => sortTabs(id)} className='focus:outline-none'>
        <SortIcon />
      </IconButton>
    </Tooltip>
  )
})
