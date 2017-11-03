import React, { Component } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { SpringSystem } from 'rebound'
import css from 'dom-css'

const shadowTopStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 10,
  background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0) 100%)'
}

const shadowBottomStyle = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 10,
  background: 'linear-gradient(to top, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0) 100%)'
}

export default class ShadowScrollbars extends Component {
  onUpdate = (values) => {
    const { shadowTop, shadowBottom } = this
    const { scrollTop, scrollHeight, clientHeight } = values
    const shadowTopOpacity = 1 / 20 * Math.min(scrollTop, 20)
    const bottomScrollTop = scrollHeight - clientHeight
    const shadowBottomOpacity = 1 / 20 * (bottomScrollTop - Math.max(scrollTop, bottomScrollTop - 20))
    css(shadowTop, { opacity: shadowTopOpacity })
    css(shadowBottom, { opacity: shadowBottomOpacity })
  }

  handleSpringUpdate = (spring) => {
    const { scrollbars } = this
    if (scrollbars) {
      const val = spring.getCurrentValue()
      scrollbars.scrollTop(val)
    }
  }

  handleLeftSpringUpdate = (spring) => {
    const { scrollbars } = this
    if (scrollbars) {
      const val = spring.getCurrentValue()
      scrollbars.scrollLeft(val)
    }
  }

  scrollTo = (top) => {
    const { scrollbars } = this
    if (scrollbars) {
      const scrollTop = scrollbars.getScrollTop()
      this.spring.setCurrentValue(scrollTop).setAtRest()
      this.spring.setEndValue(scrollTop + top)
    }
  }

  scrollToLeft = (left) => {
    const { scrollbars } = this
    if (scrollbars) {
      const scrollLeft = scrollbars.getScrollLeft()
      this.leftSpring.setCurrentValue(scrollLeft).setAtRest()
      this.leftSpring.setEndValue(scrollLeft + left)
    }
  }

  componentDidMount () {
    this.springSystem = new SpringSystem()
    this.spring = this.springSystem.createSpring()
    this.spring.addListener({ onSpringUpdate: this.handleSpringUpdate })
    this.leftSpring = this.springSystem.createSpring()
    this.leftSpring.addListener({ onSpringUpdate: this.handleLeftSpringUpdate })
  }

  componentWillUnmount () {
    this.springSystem.deregisterSpring(this.spring)
    this.springSystem.removeAllListeners()
    this.spring.destroy()
    this.leftSpring.destroy()
    this.springSystem = null
    this.leftSpring = null
    this.spring = null
  }

  render () {
    const { style, ...props } = this.props
    const containerStyle = {
      ...style,
      position: 'relative'
    }
    return (
      <div
        ref={(node) => { this.node = node || this.node }}
        style={containerStyle}
      >
        <div ref={(shadowTop) => { this.shadowTop = shadowTop || this.shadowTop }}
          style={shadowTopStyle} />
        <div ref={(shadowBottom) => { this.shadowBottom = shadowBottom || this.shadowBottom }}
          style={shadowBottomStyle} />
        <Scrollbars
          ref={(scrollbars) => { this.scrollbars = scrollbars }}
          onUpdate={this.onUpdate}
          {...props} />
      </div>
    )
  }
}
