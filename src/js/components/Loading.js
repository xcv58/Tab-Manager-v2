import React, { Component } from 'react'

export default class Loading extends Component {
  state = { tooLong: false }

  componentDidMount () {
    this.timer = setTimeout(() => {
      this.setState({ tooLong: true })
      this.timer = null
    }, 100)
  }

  componentWillUnmount () {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  render () {
    return (
      <div id='spinner'>
        <div className='la-ball-spin la-dark la-3x'>
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
        </div>
      </div>
    )
  }
}
