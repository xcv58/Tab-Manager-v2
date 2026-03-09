import React, { SyntheticEvent, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import classNames from 'classnames'
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
import { MIN_INTERACTIVE_ROW_HEIGHT } from 'libs/layoutMetrics'
import { matchesSearchText } from 'stores/SearchStore'
import Tab from 'stores/Tab'

type Props = {
  tab: Tab
}

export default observer(function TabOption(props: Props) {
  const { tab } = props
  const { searchStore, userStore } = useStore()
  const { query } = searchStore
  const theme = useTheme()
  const showGroupTitle = matchesSearchText(tab.groupTitle, query)
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

  return (
    <div tabIndex={-1} className="relative flex w-full">
      {pin}
      <Icon tab={tab} faked />
      <button
        className="group m-0 flex h-12 flex-1 flex-col justify-center overflow-hidden rounded-sm text-left text-base"
        style={{ minHeight: MIN_INTERACTIVE_ROW_HEIGHT }}
        onAuxClick={onAuxClick}
      >
        <div className="w-full min-w-0 overflow-hidden truncate">
          {getHighlightNode(tab.title)}
        </div>
        {(userStore.showUrl || showGroupTitle) && (
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
            {userStore.showUrl && (
              <div
                className={classNames('min-w-0 overflow-hidden truncate', {
                  'flex-1': showGroupTitle,
                  'w-full': !showGroupTitle,
                })}
              >
                {getHighlightNode(tab.url)}
              </div>
            )}
            {showGroupTitle && (
              <div
                className={classNames('min-w-0 overflow-hidden truncate', {
                  'max-w-[45%] shrink-0': userStore.showUrl,
                  'w-full': !userStore.showUrl,
                })}
              >
                in {tab.groupTitle}
              </div>
            )}
          </div>
        )}
      </button>
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
