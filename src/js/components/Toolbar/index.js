import React from 'react'
import SelectAll from './SelectAll'
import Close from './Close'
import NewWindow from './NewWindow'
import GroupAndSort from './GroupAndSort'

export default () => (
  <div style={{
    display: 'flex'
  }}>
    <GroupAndSort />
    <SelectAll />
    <NewWindow />
    <Close />
  </div>
)
