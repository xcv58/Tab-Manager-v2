import React, { Component } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { SpringSystem } from 'rebound'
import css from 'dom-css'

const shadowStyle = {
  zIndex: 999,
  pointerEvents: 'none',
  position: 'absolute',
  left: 0,
  right: 0,
  height: '1.2rem'
}

const shadowTopStyle = {
  ...shadowStyle,
  top: 0,
  background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0) 100%)'
}

const shadowBottomStyle = {
  ...shadowStyle,
  bottom: 0,
  background: 'linear-gradient(to top, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0) 100%)'
}

export default class ShadowScrollbars extends Component {
  node = React.createRef()
  scrollbarsRef = React.createRef()
  shadowBottom = React.createRef()
  shadowTop = React.createRef()

  onUpdate = (values) => {
    const { shadowTop, shadowBottom } = this
    const { scrollTop, scrollHeight, clientHeight } = values
    const shadowTopOpacity = 1 / 20 * Math.min(scrollTop, 20)
    const bottomScrollTop = scrollHeight - clientHeight
    const shadowBottomOpacity = 1 / 20 * (bottomScrollTop - Math.max(scrollTop, bottomScrollTop - 20))
    css(shadowTop.current, { opacity: shadowTopOpacity })
    css(shadowBottom.current, { opacity: shadowBottomOpacity })
  }

  getSpringUpdateFunc = (func) => (spring) => {
    if (func && typeof func === 'function') {
      func(spring.getCurrentValue())
    }
  }

  getBoundingClientRect = () => {
    return this.node.current.getBoundingClientRect()
  }

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
        <Scrollbars
          ref={this.scrollbarsRef}
          onUpdate={this.onUpdate}
          {...props} />
        <div
          ref={this.shadowTop}
          style={shadowTopStyle} />
        <div
          ref={this.shadowBottom}
          style={shadowBottomStyle} />
      </div>
    )
  }
}
