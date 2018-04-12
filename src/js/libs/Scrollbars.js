import React, { Component } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { SpringSystem } from 'rebound'

export default class CustomScrollbars extends Component {
  node = React.createRef()
  scrollbarsRef = React.createRef()

  getSpringUpdateFunc = (func) => (spring) => {
    if (func && typeof func === 'function') {
      func(spring.getCurrentValue())
    }
  }

  getBoundingClientRect = () => this.node.current.getBoundingClientRect()

  scrollTo = ({ top = 0, left = 0 }) => {
    if (!top && !left) {
      return
    }
    const scrollbars = this.scrollbarsRef.current
    if (scrollbars) {
      const scrollTop = scrollbars.getScrollTop()
      const scrollLeft = scrollbars.getScrollLeft()
      this.leftSpring.setCurrentValue(scrollLeft).setAtRest()
      this.leftSpring.setEndValue(scrollLeft + left)
      this.spring.setCurrentValue(scrollTop).setAtRest()
      this.spring.setEndValue(scrollTop + top)
    }
  }

  componentDidMount () {
    const { scrollTop, scrollLeft } = this.scrollbarsRef.current
    this.springSystem = new SpringSystem()
    this.spring = this.springSystem.createSpring()
    this.spring.addListener({
      onSpringUpdate: this.getSpringUpdateFunc(scrollTop)
    })
    this.leftSpring = this.springSystem.createSpring()
    this.leftSpring.addListener({
      onSpringUpdate: this.getSpringUpdateFunc(scrollLeft)
    })
  }

  componentWillUnmount () {
    this.springSystem.deregisterSpring(this.spring)
    this.springSystem.removeAllListeners()
    this.spring.destroy()
    this.leftSpring.destroy()
    this.spring = null
    this.leftSpring = null
    this.springSystem = null
  }

  render () {
    const { style, ...props } = this.props
    const containerStyle = {
      ...style,
      position: 'relative'
    }
    return (
      <div
        ref={this.node}
        style={containerStyle}
      >
        <Scrollbars ref={this.scrollbarsRef} {...props} />
      </div>
    )
  }
}
