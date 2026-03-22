import React from 'react'
import { ExpandMoreIcon, ChevronRightIcon } from 'icons/materialIcons'
import ControlIconButton from 'components/ControlIconButton'

export default ({ hide, toggleHide }) => {
  const icon = hide ? (
    <ChevronRightIcon fontSize={16} />
  ) : (
    <ExpandMoreIcon fontSize={16} />
  )
  return (
    <ControlIconButton
      onClick={toggleHide}
      controlSize="compact"
      aria-label="Toggle window hide"
    >
      {icon}
    </ControlIconButton>
  )
}
