import React from 'react'
import IconButton from 'material-ui/IconButton'

const buttonWidth = '2.5rem'
const iconWidth = '1.5rem'

export default class Icon extends React.Component {
  render () {
    const { focus, select, iconUrl } = this.props.tab
    return (
      <IconButton
        onClick={select}
        onFocus={focus}
        style={{
          width: buttonWidth,
          height: buttonWidth
        }}>
        <img src={iconUrl}
          style={{
            width: iconWidth,
            height: iconWidth
          }}
        />
      </IconButton>
    )
  }
}
