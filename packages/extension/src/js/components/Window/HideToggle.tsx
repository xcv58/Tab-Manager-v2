import React from 'react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ControlIconButton from 'components/ControlIconButton'

export default ({ hide, toggleHide }) => {
  const icon = hide ? (
    <ChevronRightIcon fontSize="small" />
  ) : (
    <ExpandMoreIcon fontSize="small" />
  )
  return (
    <ControlIconButton
      onClick={toggleHide}
      className="text-slate-400"
      controlSize="medium"
      aria-label="Toggle window hide"
    >
      {icon}
    </ControlIconButton>
  )
}
