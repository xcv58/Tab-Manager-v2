import React from 'react'
import { inject, observer } from 'mobx-react'
import { withTheme } from 'material-ui/styles'
import Slide from 'material-ui/transitions/Slide'
import SelectAll from './SelectAll'
import Reload from './Reload'
import Close from './Close'
import InvertSelect from './InvertSelect'
import NewWindow from './NewWindow'
import GroupAndSort from './GroupAndSort'
import Settings from './Settings'
import Help from './Help'

@withTheme()
@inject('userStore')
@observer
export default class Toolbar extends React.Component {
  render () {
    const { theme } = this.props
    const { toolbarVisible } = this.props.userStore
    return (
      <Slide in={toolbarVisible} direction='up' style={{ display: 'flex' }}>
        <div>
          <Settings />
          <Help />
          <div
            style={{
              margin: `0 ${theme.spacing.unit}px`,
              backgroundColor: theme.palette.divider,
              height: '89%',
              width: 1
            }}
          />
          <GroupAndSort />
          <SelectAll />
          <InvertSelect />
          <NewWindow />
          <Reload />
          <Close />
        </div>
      </Slide>
    )
  }
}
