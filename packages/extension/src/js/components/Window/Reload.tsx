import React from 'react'
import Tooltip from '@mui/material/Tooltip'
import Refresh from '@mui/icons-material/Refresh'
import ControlIconButton from 'components/ControlIconButton'

export default ({ reload }) => (
  <Tooltip title="Reload all tabs">
    <ControlIconButton
      onClick={reload}
      className="text-slate-400"
      controlSize="medium"
      aria-label="Reload all tabs"
    >
      <Refresh />
    </ControlIconButton>
  </Tooltip>
)
