import React from 'react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ControlIconButton from 'components/ControlIconButton'

export default ({ hide, toggleHide }) => {
  const icon = hide ? (
    <ChevronRightIcon sx={{ fontSize: 16 }} />
  ) : (
    <ExpandMoreIcon sx={{ fontSize: 16 }} />
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
