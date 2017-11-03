import React, { Component } from 'react'
import { CircularProgress } from 'material-ui/Progress'

export default class Loading extends Component {
  state = { tooLong: false }

  componentDidMount () {
    this.timer = setTimeout(() => this.setState({ tooLong: true }), 100)
  }

  componentWillMount () {
    if (this.timer) {
      clearTimeout(this.timer)
    }
  }

  render () {
    if (!this.state.tooLong) {
      return null
    }
    return (
      <div style={{
        display: 'flex',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <CircularProgress size={128} />
      </div>
    )
  }
}
