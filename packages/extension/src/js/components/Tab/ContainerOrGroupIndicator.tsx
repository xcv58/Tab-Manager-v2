import React from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import ContainerIndicator from './_ContainerIndicator'
import TabGroupIndicator from './_TabGroupIndicator'

const ContainerOrGroupIndicator = observer((props) => {
  const { groupId } = props
  const { tabGroupStore, containerStore } = useStore()

  const hasGroupId =
    !!tabGroupStore?.hasTabGroupsApi?.() && !tabGroupStore.isNoGroupId(groupId)
  if (hasGroupId) {
    return <TabGroupIndicator {...props} />
  }

  if (process.env.TARGET_BROWSER === 'firefox' && containerStore) {
    return <ContainerIndicator {...props} />
  }

  return null
})

export default ContainerOrGroupIndicator
