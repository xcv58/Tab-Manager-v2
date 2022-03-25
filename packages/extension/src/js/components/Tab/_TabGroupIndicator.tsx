import React from 'react'
import { useStore } from 'components/hooks/useStore'
import Tab from 'stores/Tab'
import { TabGroup } from 'stores/TabGroupStore'

const _TabGroupIndicator = (props: Tab) => {
  const { groupId } = props
  const { tabGroupStore } = useStore()
  const tabGroup: TabGroup = tabGroupStore.getTabGroup(groupId)
  if (!groupId || groupId === -1 || !tabGroup) {
    return null
  }
  return (
    <hr
      className="absolute border"
      style={{
        width: 'calc(100% - 24px)',
        left: 12,
        bottom: 2,
        borderColor: tabGroup.color,
      }}
    />
  )
}

export default _TabGroupIndicator
