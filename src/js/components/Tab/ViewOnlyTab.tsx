import React from 'react'
import { observer } from 'mobx-react-lite'
import Icon from 'components/Tab/Icon'
import TabTools from 'components/Tab/TabTools'
import TabContent from 'components/Tab/TabContent'
import { TabProps } from 'components/types'
import PIN from './Pin'

export default observer((props: TabProps) => {
  const { tab } = props
  const pin = tab.pinned && PIN

  return (
    <div tabIndex={-1} className='flex w-full'>
      {pin}
      <Icon tab={tab} faked />
      <TabContent tab={tab} faked />
      <TabTools tab={tab} faked />
    </div>
  )
})
