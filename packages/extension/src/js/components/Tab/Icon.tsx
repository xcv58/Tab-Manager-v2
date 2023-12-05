import React from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import { Checkbox } from '@material-tailwind/react'
import { useStore } from 'components/hooks/useStore'
import { TabProps } from 'components/types'

export const Icon = observer((props: TabProps) => {
  const { userStore } = useStore()
  const { select, iconUrl, isSelected, bulkSelect } = props.tab
  const checkbox = (
    <Checkbox
      color="indigo"
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
        className={classNames('bg-blue-gray-100', {
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
    <div className="flex items-center justify-center w-10 group">
      <img className="w-6 h-6" src={iconUrl} />
    </div>
  )
})
