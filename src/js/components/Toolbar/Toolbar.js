import React from 'react'
import { inject, observer } from 'mobx-react'
import Slide from 'material-ui/transitions/Slide'
import SelectAll from './SelectAll'
import Close from './Close'
import NewWindow from './NewWindow'
import GroupAndSort from './GroupAndSort'

@inject('userStore')
@observer
export default class Toolbar extends React.Component {
  render () {
    const { toolbarVisible } = this.props.userStore
    if (!toolbarVisible) {
      return null
    }
    return (
      <Slide direction='up' in>
        <div>
          <GroupAndSort />
          <SelectAll />
          <NewWindow />
          <Close />
        </div>
      </Slide>
    )
  }
}
