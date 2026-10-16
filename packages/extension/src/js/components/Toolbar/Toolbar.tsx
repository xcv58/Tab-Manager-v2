import React from 'react'
import { observer } from 'mobx-react-lite'
import { Slide } from 'components/ui/Transition'
import GroupAndSort from 'components/Toolbar/GroupAndSort'
import SelectAll from 'components/Toolbar/SelectAll'
import Reload from 'components/Toolbar/Reload'
import RemoveDuplicated from 'components/Toolbar/RemoveDuplicated'
import Close from 'components/Toolbar/Close'
import Settings from 'components/Toolbar/Settings'
import Help from 'components/Toolbar/Help'
import VerticalDivider from 'components/Toolbar/VerticalDivider'
import useReduceMotion from 'libs/useReduceMotion'
import { defaultTransitionDuration } from 'libs/transition'
import ToolbarActionsMenu from './ToolbarActionsMenu'

export default observer(
  ({
    visible,
    onMenuOpenChange,
  }: {
    visible: boolean
    onMenuOpenChange: (open: boolean) => void
  }) => {
    const reduceMotion = useReduceMotion()
    return (
      <Slide
        in={visible}
        direction="up"
        style={{ display: 'flex' }}
        timeout={reduceMotion ? 1 : defaultTransitionDuration.enter}
      >
        <div
          data-toolbar-base
          role="group"
          aria-label="Workspace toolbar"
          aria-keyshortcuts="Control+Shift+F"
          className="flex items-center gap-1 px-1 text-sm whitespace-nowrap"
          style={{
            minHeight: 40,
            minWidth: 0,
            maxWidth: '100%',
            overflowX: 'auto',
          }}
        >
          <Settings />
          <Help />
          <VerticalDivider />
          <GroupAndSort />
          <SelectAll />
          <VerticalDivider />
          <Reload focusedOnly />
          <RemoveDuplicated />
          <ToolbarActionsMenu
            showLabel={false}
            onOpenChange={onMenuOpenChange}
          />
          <VerticalDivider />
          <Close focusedOnly />
        </div>
      </Slide>
    )
  },
)
