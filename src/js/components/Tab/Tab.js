import React from 'react'
import { inject, observer } from 'mobx-react'
import { blue, grey } from 'material-ui/colors'
import Icon from './Icon'

const borderBottom = `1px solid ${grey[200]}`
const borderTop = '1px solid white'
const tabStyle = {
  display: 'flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  borderTop,
  borderBottom
}
const highlightStyle = {
  backgroundColor: blue[100],
  borderTop: `1px solid ${blue[100]}`
}
const focusedStyle = {
  borderLeft: '1px red solid',
  marginLeft: -1
}
const notMatchStyle = {
  opacity: 0.2
}

@inject('searchStore')
@inject('tabStore')
@observer
export default class Tab extends React.Component {
  onClick = () => {
    this.props.searchStore.focus(this.props)
    this.props.tabStore.activate(this.props)
  }

  getStyle = () => {
    const {
      id,
      tabStore: { selection },
      searchStore: { query, matchedSet, focusedTab }
    } = this.props
    const styles = [ tabStyle ]
    if (selection.has(id)) {
      styles.push(highlightStyle)
    }
    if (focusedTab === id) {
      styles.push(focusedStyle)
    }
    if (Boolean(query) && !matchedSet.has(id)) {
      styles.push(notMatchStyle)
    }
    return Object.assign({}, ...styles)
  }

  render () {
    const { title } = this.props
    const style = this.getStyle()
    return (
      <div style={style}>
        <Icon {...this.props} />
        <div
          onClick={this.onClick}
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
          {title}
        </div>
      </div>
    )
  }
}
