import React from 'react'
import { inject, observer } from 'mobx-react'
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
      <div>
        <GroupAndSort />
        <SelectAll />
        <NewWindow />
        <Close />
      </div>
    )
  }
}
