import React from 'react'
import { inject, observer } from 'mobx-react'
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

@inject('userStore')
@observer
export default class Toolbar extends React.Component {
  render () {
    const { toolbarVisible } = this.props.userStore
    return (
      <Slide in={toolbarVisible} direction='up' style={{ display: 'flex' }}>
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
  }
}
