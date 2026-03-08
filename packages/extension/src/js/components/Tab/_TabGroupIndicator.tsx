import React from 'react'
import { useStore } from 'components/hooks/useStore'
import Tab from 'stores/Tab'
import { TabGroup } from 'stores/TabGroupStore'
import { getChromeTabGroupColor } from 'libs/chromeTabGroupColors'

const GROUP_INDICATOR_INSET = 6

const _TabGroupIndicator = (props: Tab) => {
  const { groupId, id } = props
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
      data-testid={`tab-group-indicator-${id}`}
      style={{
        left: GROUP_INDICATOR_INSET,
        right: GROUP_INDICATOR_INSET,
        bottom: 3,
        margin: 0,
        borderTopColor: color,
        borderTopWidth: 1,
        borderTopStyle: tabGroup.shared ? 'dashed' : 'solid',
      }}
    />
  )
}

export default _TabGroupIndicator
