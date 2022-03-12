import React from 'react'
import IconButton from '@mui/material/IconButton'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight'

export default ({ hide, toggleHide }) => {
  const icon = hide ? <KeyboardArrowRight /> : <KeyboardArrowDown />
  return (
    <IconButton
      onClick={toggleHide}
      className="focus:outline-none"
      aria-label="Toggle window hide"
    >
      {icon}
    </IconButton>
  )
}
