import React from 'react'
import { inject, observer } from 'mobx-react'
import Window from './Window'
import Search from './Search'

@inject('timerStore')
@observer
export default class Timer extends React.Component {
  onReset = () => {
    this.props.timerStore.resetTimer()
  }

  render () {
    const { timerStore: { tabCount, windows } } = this.props
    const winList = windows.map((win) => (
      <Window key={win.id} {...win} />
    ))
    return (
      <div>
        <Search />
        Tabs: {tabCount}
        {winList}
      </div>
    )
  }
}
