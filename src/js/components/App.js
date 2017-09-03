import React from 'react'
import { inject, observer } from 'mobx-react'
import Window from './Window'
import Search from './Search'

@inject('windowsStore')
@observer
export default class App extends React.Component {
  render () {
    const { windowsStore: { tabCount, windows } } = this.props
    const winList = windows.map((win) => (
      <Window key={win.id} {...win} />
    ))
    return (
      <div>
        {/* <Search /> */}
        <p>
          Tabs: {tabCount}
        </p>
        {winList}
      </div>
    )
  }
}
