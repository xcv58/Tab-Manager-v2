import React from 'react'
import { observer } from 'mobx-react-lite'
import Icon from 'components/Tab/Icon'
import TabTools from 'components/Tab/TabTools'
import TabContent from 'components/Tab/TabContent'
import { TabProps } from 'components/types'
import PIN from './Pin'
import ContainerIndicator from './ContainerIndicator'
import CloseButton from 'components/CloseButton'

export default observer((props: TabProps) => {
  const { tab } = props
  const pin = tab.pinned && PIN

  const onRemove = (event: React.SyntheticEvent) => {
    event.stopPropagation()
    const { removing, remove } = tab
    if (!removing) {
      remove()
    }
  }

  return (
    <div tabIndex={-1} className='relative flex w-full'>
      {pin}
      <Icon tab={tab} faked />
      <TabContent tab={tab} faked />
      <TabTools tab={tab} faked />
      <ContainerIndicator cookieStoreId={tab.cookieStoreId} />
      <CloseButton
        onClick={onRemove}
        disabled={tab.removing}
      />
    </div>
  )
})
