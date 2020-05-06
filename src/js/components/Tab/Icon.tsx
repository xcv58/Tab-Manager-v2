import React from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import Checkbox from '@material-ui/core/Checkbox'
import IconButton from '@material-ui/core/IconButton'
import { useStore } from 'components/StoreContext'
import { TabProps } from 'components/types'

const ARIA_LABEL = 'Toggle select'

export default observer((props: TabProps) => {
  const { userStore } = useStore()
  const { faked, tab } = props
  const { focus, select, iconUrl, isSelected, bulkSelect } = tab
  if (faked) {
    return (
      <IconButton
        aria-label={ARIA_LABEL}
        className='focus:outline-none focus:shadow-outline'
      >
        <img className='w-6 h-6' src={iconUrl} />
      </IconButton>
    )
  }
  const checkbox = (
    <Checkbox
      color='primary'
      checked={isSelected}
      inputProps={{
        'aria-label': ARIA_LABEL
      }}
      onClick={(e) => {
        if (isSelected || !e.shiftKey) {
          select()
        } else {
          bulkSelect()
        }
      }}
    />
  )
  if (!userStore.showTabIcon) {
    return checkbox
  }
  return (
    <div className='group'>
      <div
        className={classNames({
          hidden: isSelected,
          'group-hover:hidden': !isSelected
        })}
      >
        <IconButton
          aria-label={ARIA_LABEL}
          className='focus:outline-none focus:shadow-outline'
          onClick={select}
          onFocus={focus}
        >
          <img className='w-6 h-6' src={iconUrl} />
        </IconButton>
      </div>
      <div
        className={classNames('focus:outline-none focus:shadow-outline', {
          'hidden group-hover:block': !isSelected
        })}
      >
        {checkbox}
      </div>
    </div>
  )
})
