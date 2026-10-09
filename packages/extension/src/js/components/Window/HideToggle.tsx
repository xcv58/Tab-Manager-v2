import React from 'react'
import { ExpandMoreIcon, ChevronRightIcon } from 'icons/materialIcons'
import ControlIconButton from 'components/ControlIconButton'
import Tooltip from 'components/ui/Tooltip'

export default ({ hide, toggleHide }) => {
  const label = hide ? 'Expand window' : 'Collapse window'
  const icon = hide ? (
    <ChevronRightIcon fontSize={16} />
  ) : (
    <ExpandMoreIcon fontSize={16} />
  )
  return (
    <Tooltip title={label}>
      <span className="inline-flex">
        <ControlIconButton
          onClick={toggleHide}
          controlSize="compact"
          aria-label={label}
          aria-expanded={!hide}
        >
          {icon}
        </ControlIconButton>
      </span>
    </Tooltip>
  )
}
