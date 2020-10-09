import React from 'react'
import { observer } from 'mobx-react-lite'
import Slide from '@material-ui/core/Slide'
import SelectAll from 'components/Toolbar/SelectAll'
import Reload from 'components/Toolbar/Reload'
import Close from 'components/Toolbar/Close'
import InvertSelect from 'components/Toolbar/InvertSelect'
import NewWindow from 'components/Toolbar/NewWindow'
import GroupAndSort from 'components/Toolbar/GroupAndSort'
import Settings from 'components/Toolbar/Settings'
import Help from 'components/Toolbar/Help'
import RemoveDuplicated from 'components/Toolbar/RemoveDuplicated'
import VerticalDivider from 'components/Toolbar/VerticalDivider'
import { useStore } from 'components/hooks/useStore'
import useReduceMotion from 'libs/useReduceMotion'
import { duration } from '@material-ui/core/styles/transitions'

export default observer(() => {
  const { userStore } = useStore()
  const { toolbarVisible } = userStore
  const reduceMotion = useReduceMotion()
  return (
    <Slide
      in={toolbarVisible}
      direction='up'
      style={{ display: 'flex' }}
      timeout={reduceMotion ? 1 : duration.enteringScreen}
    >
      <div>
        <Settings />
        <Help />
        <VerticalDivider />
        <GroupAndSort />
        <SelectAll />
        <InvertSelect />
        <NewWindow />
        <VerticalDivider />
        <Reload />
        <RemoveDuplicated />
        <Close />
        <VerticalDivider />
      </div>
    </Slide>
  )
})
