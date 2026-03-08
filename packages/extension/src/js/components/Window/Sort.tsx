import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@mui/material/Tooltip'
import SortIcon from '@mui/icons-material/Sort'
import { useStore } from 'components/hooks/useStore'
import { WinProps } from 'components/types'
import ControlIconButton from 'components/ControlIconButton'

export default observer((props: WinProps) => {
  const { arrangeStore } = useStore()
  const { id } = props.win
  const { sortTabs } = arrangeStore
  return (
    <Tooltip title="Sort tabs">
      <ControlIconButton
        onClick={() => sortTabs(id)}
        controlSize="compact"
        aria-label="Sort tabs"
      >
        <SortIcon fontSize="small" />
      </ControlIconButton>
    </Tooltip>
  )
})
