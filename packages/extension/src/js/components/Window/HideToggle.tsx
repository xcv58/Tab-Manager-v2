import React from 'react'
import IconButton from '@mui/material/IconButton'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight'

const CONTROL_SX = {
  width: 40,
  height: 40,
  p: 1,
  m: 0,
}

export default ({ hide, toggleHide }) => {
  const icon = hide ? <KeyboardArrowRight /> : <KeyboardArrowDown />
  return (
    <IconButton
      onClick={toggleHide}
      className="focus:outline-none"
      aria-label="Toggle window hide"
      sx={CONTROL_SX}
    >
      {icon}
    </IconButton>
  )
}
