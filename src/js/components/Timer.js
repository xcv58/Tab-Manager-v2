import React from 'react'
import { inject, observer } from 'mobx-react'

@inject('timerStore')
@observer
export default class Timer extends React.Component {
  onReset = () => {
    this.props.timerStore.resetTimer()
  }

  render () {
    return (
      <button onClick={this.onReset}>
        Seconds passed: {this.props.timerStore.timer}
      </button>
    )
  }
}
