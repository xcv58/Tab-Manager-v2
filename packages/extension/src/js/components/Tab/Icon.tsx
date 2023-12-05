import React from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import { Checkbox } from '@material-tailwind/react'
import { IconButton } from '@material-tailwind/react'
import { useStore } from 'components/hooks/useStore'
import { TabProps } from 'components/types'

const ARIA_LABEL = 'Toggle select'

export const Icon = observer((props: TabProps) => {
  const { userStore } = useStore()
  const { select, iconUrl, isSelected, bulkSelect } = props.tab
  const checkbox = (
    <Checkbox
      checked={isSelected}
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
    <div className="flex justify-center w-12 group">
      <div
        className={classNames({
          hidden: isSelected,
          'group-hover:hidden': !isSelected,
        })}
      >
        <img className="w-6 h-6" src={iconUrl} />
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
  const { iconUrl } = tab
  if (!faked) {
    return <Icon {...props} />
  }
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
