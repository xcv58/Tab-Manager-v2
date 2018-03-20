import React from 'react'
import { inject, observer } from 'mobx-react'
import Slide from 'material-ui/transitions/Slide'
import SelectAll from './SelectAll'
import Close from './Close'
import InvertSelect from './InvertSelect'
import NewWindow from './NewWindow'
import GroupAndSort from './GroupAndSort'
import ToolbarSwitch from './ToolbarSwitch'

@inject('userStore')
@observer
export default class Toolbar extends React.Component {
  render () {
    const { toolbarVisible } = this.props.userStore
    return (
      <Slide in={toolbarVisible} direction='up'>
        <div>
          <ToolbarSwitch />
          <GroupAndSort />
          <SelectAll />
          <InvertSelect />
          <NewWindow />
          <Close />
        </div>
      </Slide>
    )
  }
}
