import React from 'react'
import { observer } from 'mobx-react-lite'
import { Slide } from 'components/ui/Transition'
import GroupAndSort from 'components/Toolbar/GroupAndSort'
import SelectAll from 'components/Toolbar/SelectAll'
import InvertSelect from 'components/Toolbar/InvertSelect'
import Reload from 'components/Toolbar/Reload'
import RemoveDuplicated from 'components/Toolbar/RemoveDuplicated'
import Close from 'components/Toolbar/Close'
import NewWindow from 'components/Toolbar/NewWindow'
import Settings from 'components/Toolbar/Settings'
import Help from 'components/Toolbar/Help'
import VerticalDivider from 'components/Toolbar/VerticalDivider'
import { useStore } from 'components/hooks/useStore'
import useReduceMotion from 'libs/useReduceMotion'
import { defaultTransitionDuration } from 'libs/transition'
import ToolbarActionsMenu from './ToolbarActionsMenu'
import TabGroupRow from 'stores/TabGroupRow'
import Window from 'stores/Window'

export default observer(
  ({
    visible,
    onMenuOpenChange,
  }: {
    visible: boolean
    onMenuOpenChange: (open: boolean) => void
  }) => {
    const { tabStore, focusStore } = useStore()
    const selectedCount = tabStore.selection.size
    const focusedItem = focusStore.focusedItem
    const scope = selectedCount
      ? `${selectedCount} selected`
      : focusedItem instanceof Window
        ? `${focusedItem.tabs.length} tabs in this window`
        : focusedItem instanceof TabGroupRow
          ? 'This group'
          : null
    const reduceMotion = useReduceMotion()
    return (
      <Slide
        in={visible}
        direction="up"
        style={{ display: 'flex' }}
        timeout={reduceMotion ? 1 : defaultTransitionDuration.enter}
      >
        <div
          className="flex items-center gap-1 px-1 text-sm whitespace-nowrap"
          style={{
            minHeight: 40,
            minWidth: 0,
            maxWidth: '100%',
            overflowX: 'auto',
          }}
        >
          {selectedCount === 0 && (
            <>
              <Settings />
              <Help />
              <VerticalDivider />
              <GroupAndSort />
              <SelectAll />
              <InvertSelect />
            </>
          )}
          {scope && (
            <>
              <span className="px-1 text-xs opacity-75" role="status">
                {scope}
              </span>
              <VerticalDivider />
            </>
          )}
          <NewWindow label={selectedCount ? 'New window' : undefined} />
          {selectedCount === 0 && <VerticalDivider />}
          <Reload label={selectedCount ? 'Reload' : undefined} />
          {selectedCount === 0 && <RemoveDuplicated />}
          <ToolbarActionsMenu
            showLabel={selectedCount > 0}
            onOpenChange={onMenuOpenChange}
          />
          <VerticalDivider />
          <Close label={selectedCount ? `Close ${selectedCount}` : undefined} />
        </div>
      </Slide>
    )
  },
)
