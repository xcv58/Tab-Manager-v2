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

  componentDidUpdate () {
    const {
      faked, id, searchStore: { focusedTab, searchTriggered, scrolled }
    } = this.props
    if (!faked && id === focusedTab) {
      const containmentRect = this.props.containment().getBoundingClientRect()
      const { top, bottom } = this.node.getBoundingClientRect()
      const topGap = top - containmentRect.top
      const bottomGap = containmentRect.bottom - bottom
      if (topGap > 0 && bottomGap > 0) {
        return
      }
      const scrollOption = {
        block: 'end',
        inline: 'start',
        behavior: 'smooth'
      }
      if (searchTriggered) {
        scrollOption.behavior = 'auto'
        scrolled()
      }
      this.node.scrollIntoView(scrollOption)
    }
  }

  render () {
    const { title } = this.props
    const style = this.getStyle()
    return (
      <div ref={(node) => { this.node = node }}
        style={style}>
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
