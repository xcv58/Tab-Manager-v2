import React from 'react'
import Tooltip from 'components/ui/Tooltip'
import { RefreshIcon } from 'icons/materialIcons'
import ControlIconButton from 'components/ControlIconButton'

export default ({ reload }) => (
  <Tooltip title="Reload all tabs">
    <ControlIconButton
      onClick={reload}
      controlSize="compact"
      aria-label="Reload all tabs"
    >
      <RefreshIcon fontSize={16} />
    </ControlIconButton>
  </Tooltip>
)
