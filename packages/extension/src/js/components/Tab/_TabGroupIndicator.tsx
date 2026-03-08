import React from 'react'
import { useStore } from 'components/hooks/useStore'
import Tab from 'stores/Tab'
import { TabGroup } from 'stores/TabGroupStore'
import { getChromeTabGroupColor } from 'libs/chromeTabGroupColors'

const _TabGroupIndicator = (props: Tab) => {
  const { groupId } = props
  const { tabGroupStore } = useStore()
  if (!tabGroupStore) {
    return null
  }
  const tabGroup: TabGroup = tabGroupStore.getTabGroup(groupId)
  if (tabGroupStore.isNoGroupId(groupId) || !tabGroup) {
    return null
  }
  const color = getChromeTabGroupColor(tabGroup.color).line
  return (
    <hr
      className="absolute border-0"
      style={{
        left: 12,
        right: 12,
        bottom: 1,
        margin: 0,
        borderTopColor: color,
        borderTopWidth: 1,
        borderTopStyle: tabGroup.shared ? 'dashed' : 'solid',
      }}
    />
  )
}

export default _TabGroupIndicator
