import React from 'react'
import SelectAll from './SelectAll'
import Close from './Close'
import GroupAndSort from './GroupAndSort'

export default () => (
  <div style={{
    display: 'flex'
  }}>
    <GroupAndSort />
    <SelectAll />
    <Close />
  </div>
)
