import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@mui/material/Tooltip'
import SortIcon from '@mui/icons-material/Sort'
import IconButton from '@mui/material/IconButton'
import { useStore } from 'components/hooks/useStore'
import { WinProps } from 'components/types'

export default observer((props: WinProps) => {
  const { arrangeStore } = useStore()
  const { id } = props.win
  const { sortTabs } = arrangeStore
  return (
    <Tooltip title="Sort tabs">
      <IconButton onClick={() => sortTabs(id)} className="focus:outline-none">
        <SortIcon />
      </IconButton>
    </Tooltip>
  )
})
