import React from 'react'
import DraggableTab from './Tab/DraggableTab'
import { grey } from 'material-ui/colors'
import Transition from 'react-transition-group/Transition'
import TransitionGroup from 'react-transition-group/TransitionGroup'

const duration = 300
const defaultStyle = {
  transition: `opacity ${duration}ms ease-in-out`,
  opacity: 0
}

const transitionStyles = {
  entering: { opacity: 1 },
  entered: { opacity: 1 },
  exited: { opacity: 0 },
  exiting: { opacity: 0 }
}

const borderBottom = `1px solid ${grey[200]}`

export default class Window extends React.Component {
  getBoundingClientRect = () => {
    if (this.node) {
      return this.node.getBoundingClientRect()
    }
  }

  render () {
    const { tabs, getWindowList, dragPreview } = this.props
    const content = tabs.map((tab) => (
      <Transition
        key={tab.id}
        timeout={duration}
        unmountOnExit
        onExited={() => { getWindowList().resize() }}
      >
        {(state) => (
          <DraggableTab
            style={{
              ...defaultStyle,
              ...transitionStyles[state]
            }}
            {...tab} {...{ getWindowList, dragPreview }}
          />
        )}
      </Transition>
    ))
    return (
      <div ref={(el) => { this.node = el || this.node }}>
        <div style={{
          borderBottom,
          paddingLeft: '2.5rem',
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>
          {tabs.length} tab{tabs.length > 1 && 's'}
        </div>
        <TransitionGroup appear exit>
          {content}
        </TransitionGroup>
      </div>
    )
  }
}
