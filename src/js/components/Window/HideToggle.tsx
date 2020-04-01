import React from 'react'
import IconButton from '@material-ui/core/IconButton'
import KeyboardArrowDown from '@material-ui/icons/KeyboardArrowDown'
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight'

export default ({ hide, toggleHide }) => {
  const icon = hide ? <KeyboardArrowRight /> : <KeyboardArrowDown />
  return (
    <IconButton onClick={toggleHide} className='focus:outline-none'>
      {icon}
    </IconButton>
  )
}
