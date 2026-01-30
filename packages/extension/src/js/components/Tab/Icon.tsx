import React from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import { useStore } from 'components/hooks/useStore'
import { TabProps } from 'components/types'

const ARIA_LABEL = 'Toggle select'

export const Icon = observer((props: TabProps) => {
  const { userStore } = useStore()
  const { focus, select, iconUrl, isSelected, bulkSelect } = props.tab
  const checkbox = (
    <Checkbox
      color="primary"
      checked={isSelected}
      inputProps={{
        'aria-label': ARIA_LABEL,
      }}
      onClick={(e) => {
        if (process.env.TARGET_BROWSER === 'firefox') {
          if (e.altKey) {
            return props.tab.selectTabsInSameContainer()
          }
        }
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
    <div className="group">
      <div
        className={classNames({
          hidden: isSelected,
          'group-hover:hidden': !isSelected,
        })}
      >
        <IconButton
          aria-label={ARIA_LABEL}
          className="focus:outline-none focus:ring"
          onClick={select}
          onFocus={focus}
        >
          <img className="w-6 h-6" src={iconUrl} />
        </IconButton>
      </div>
      <div
        className={classNames('focus:outline-none focus:ring', {
          'hidden group-hover:block': !isSelected,
        })}
      >
        {checkbox}
      </div>
    </div>
  )
})

export default observer((props: TabProps) => {
  const { faked, tab } = props
  if (!faked) {
    return <Icon tab={tab} />
  }
  const { iconUrl } = tab
  return (
    <div>
      <IconButton
        disabled
        aria-label={ARIA_LABEL}
        className="focus:outline-none focus:ring"
      >
        <img className="w-6 h-6" src={iconUrl} />
      </IconButton>
    </div>
  )
})
