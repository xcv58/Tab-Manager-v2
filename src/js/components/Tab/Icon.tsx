import React from 'react'
import { observer } from 'mobx-react'
import Checkbox from '@material-ui/core/Checkbox'
import IconButton from '@material-ui/core/IconButton'

export default observer(props => {
  const { focus, select, iconUrl, isSelected } = props.tab
  return (
    <div>
      <IconButton
        className='group-hover:hidden focus:outline-none focus:shadow-outline'
        onClick={select}
        onFocus={focus}
      >
        <img className='w-6 h-6' src={iconUrl} />
      </IconButton>
      <div className='hidden group-hover:block focus:outline-none focus:shadow-outline'>
        <Checkbox color='primary' checked={isSelected} onChange={select} />
      </div>
    </div>
  )
})
