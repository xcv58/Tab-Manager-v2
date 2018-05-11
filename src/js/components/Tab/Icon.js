import React from 'react'
import { observer } from 'mobx-react'
import Checkbox from 'material-ui/Checkbox'
import IconButton from 'material-ui/IconButton'

const buttonWidth = '2.5rem'
const iconWidth = '1.5rem'

@observer
export default class Icon extends React.Component {
  render () {
    const { focus, select, iconUrl, isHovered, isSelected } = this.props.tab
    if (isHovered) {
      return <Checkbox color='primary' checked={isSelected} onChange={select} />
    }
    return (
      <IconButton
        onClick={select}
        onFocus={focus}
        style={{
          width: buttonWidth,
          height: buttonWidth
        }}
      >
        <img
          src={iconUrl}
          style={{
            width: iconWidth,
            height: iconWidth
          }}
        />
      </IconButton>
    )
  }
}
