import React from 'react'
import { inject, observer } from 'mobx-react'

const fakeButtonStyle = {
  margin: 'auto',
  fontSize: '0.8rem',
  padding: 0,
  border: 'none'
}

@inject('searchStore')
@inject('windowStore')
@observer
export default class Summary extends React.Component {
  onFocus = (e) => {
    e.target.blur()
  }

  getOpacity = () => {
    const {
      searchStore: { typing, query }
    } = this.props
    if (!typing) {
      return 1
    }
    return 1 - Math.atan(query.length + 1) / Math.PI * 1.2
  }

  render () {
    const { windowStore: { tabCount, windows } } = this.props
    const opacity = this.getOpacity()
    const style = { ...fakeButtonStyle, opacity }
    return (
      <button style={style} onFocus={this.onFocus}>
        {windows.length} window{windows.length > 1 && 's'}
        , {tabCount} tab{tabCount > 1 && 's'}
      </button>
    )
  }
}
