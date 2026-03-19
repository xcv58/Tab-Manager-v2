import React, { SyntheticEvent, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import classNames from 'classnames'
import Tooltip from '@mui/material/Tooltip'
import { useTheme } from '@mui/material/styles'
import CloseButton from 'components/CloseButton'
import HighlightNode from 'components/HighlightNode'
import RowActionSlot from 'components/RowActionSlot'
import RowActionRail from 'components/RowActionRail'
import ContainerOrGroupIndicator from 'components/Tab/ContainerOrGroupIndicator'
import DuplicateMarker from 'components/Tab/DuplicateMarker'
import Icon from 'components/Tab/Icon'
import PIN from 'components/Tab/Pin'
import TabTools from 'components/Tab/TabTools'
import { useStore } from 'components/hooks/useStore'
import { TOOLTIP_DELAY } from 'libs'
import { getChromeTabGroupColor } from 'libs/chromeTabGroupColors'
import { MIN_INTERACTIVE_ROW_HEIGHT } from 'libs/layoutMetrics'
import { matchesSearchText } from 'stores/SearchStore'
import Tab from 'stores/Tab'

type Props = {
  tab: Tab
  showInlineGroupBadge?: boolean
}

export default observer(function TabOption(props: Props) {
  const { tab, showInlineGroupBadge = true } = props
  const { searchStore, tabGroupStore, userStore } = useStore()
  const { query } = searchStore
  const theme = useTheme()
  const hasTabGroupsApi = !!tabGroupStore?.hasTabGroupsApi?.()
  const tabGroup =
    hasTabGroupsApi && !tabGroupStore.isNoGroupId(tab.groupId)
      ? tabGroupStore.getTabGroup(tab.groupId)
      : null
  const groupLabel = tabGroup ? tab.groupTitle || 'Unnamed group' : ''
  const showGroupContext = !!groupLabel
  const showInlineGroupContext = showGroupContext && showInlineGroupBadge
  const groupColor = getChromeTabGroupColor(tabGroup?.color)
  const showGroupTitle = matchesSearchText(groupLabel, query)
  const pin = tab.pinned && PIN

  const onRemove = (event: React.SyntheticEvent) => {
    event.stopPropagation()
    const { removing, remove } = tab
    if (!removing) {
      remove()
    }
  }

  const onAuxClick = (event: SyntheticEvent) => {
    if (event.button === 1 && !tab.removing) {
      tab.remove()
    }
  }

  const getHighlightNode = useCallback(
    (text) => {
      if (!query) {
        return text
      }
      return <HighlightNode {...{ query, text }} />
    },
    [query],
  )

  const tooltip = showGroupContext ? (
    <div className="leading-tight break-all whitespace-normal">
      <p>{tab.title}</p>
      <p style={{ opacity: 0.8 }}>{tab.url}</p>
      <p style={{ opacity: 0.72 }}>Group: {groupLabel}</p>
    </div>
  ) : null

  const rowButton = (
    <button
      className="group m-0 flex h-12 flex-1 flex-col justify-center overflow-hidden rounded-sm text-left text-base"
      style={{ minHeight: MIN_INTERACTIVE_ROW_HEIGHT }}
      onAuxClick={onAuxClick}
    >
      <div className="w-full min-w-0 overflow-hidden truncate">
        {getHighlightNode(tab.title)}
      </div>
      {(userStore.showUrl || showInlineGroupContext) && (
        <div
          className={classNames(
            'flex w-full items-center gap-1 overflow-hidden text-xs opacity-75 transition-colors group-hover:opacity-100',
            {
              'group-hover:text-gray-900': theme.palette.mode !== 'dark',
              'group-hover:text-gray-100': theme.palette.mode === 'dark',
            },
          )}
          style={{
            color: theme.palette.mode === 'dark' ? '#aeb5c0' : '#64748b',
          }}
        >
          {showInlineGroupContext && (
            <span
              className={classNames(
                'inline-flex h-5 min-w-0 items-center truncate rounded-md px-1.5 text-[0.68rem] font-medium leading-4',
                {
                  'max-w-[45%] shrink-0': userStore.showUrl,
                  'max-w-full': !userStore.showUrl,
                },
              )}
              style={{
                backgroundColor: groupColor.line,
                color: groupColor.chipText,
              }}
              data-testid={`search-tab-group-chip-${tab.id}`}
            >
              {showGroupTitle ? getHighlightNode(groupLabel) : groupLabel}
            </span>
          )}
          {userStore.showUrl && (
            <div
              className={classNames('min-w-0 overflow-hidden truncate', {
                'flex-1': showInlineGroupContext,
                'w-full': !showInlineGroupContext,
              })}
            >
              {getHighlightNode(tab.url)}
            </div>
          )}
        </div>
      )}
    </button>
  )

  return (
    <div tabIndex={-1} className="relative flex w-full">
      {pin}
      <Icon tab={tab} faked />
      {tooltip ? (
        <Tooltip title={tooltip} enterDelay={TOOLTIP_DELAY}>
          {rowButton}
        </Tooltip>
      ) : (
        rowButton
      )}
      <RowActionRail tail={<DuplicateMarker tab={tab} faked />}>
        <TabTools tab={tab} faked />
        <RowActionSlot>
          <CloseButton
            onClick={onRemove}
            disabled={tab.removing}
            size="compact"
          />
        </RowActionSlot>
      </RowActionRail>
      <ContainerOrGroupIndicator
        groupId={tab.groupId}
        cookieStoreId={tab.cookieStoreId}
      />
    </div>
  )
})
