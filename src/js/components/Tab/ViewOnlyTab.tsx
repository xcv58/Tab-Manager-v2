import React from 'react'
import { observer } from 'mobx-react-lite'
import Icon from 'components/Tab/Icon'
import TabTools from 'components/Tab/TabTools'
import TabContent from 'components/Tab/TabContent'
import { TabProps } from 'components/types'
import PIN from './Pin'
import ContainerIndicator from './ContainerIndicator'

export default observer((props: TabProps) => {
  const { tab } = props
  const pin = tab.pinned && PIN

  return (
    <div tabIndex={-1} className='relative flex w-full'>
      {pin}
      <Icon tab={tab} faked />
      <TabContent tab={tab} faked />
      <TabTools tab={tab} faked />
      <ContainerIndicator cookieStoreId={tab.cookieStoreId} />
    </div>
  )
})
