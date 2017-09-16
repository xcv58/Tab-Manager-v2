import React, { Component } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import css from 'dom-css'

const shadowTopStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 16,
  background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0) 100%)'
}

const shadowBottomStyle = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 16,
  background: 'linear-gradient(to top, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0) 100%)'
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
        <Scrollbars
          ref={(scrollbars) => { this.scrollbars = scrollbars || this.scrollbars }}
          onUpdate={this.onUpdate}
          {...props} />
        <div ref={(shadowBottom) => { this.shadowBottom = shadowBottom || this.shadowBottom }}
          style={shadowBottomStyle} />
      </div>
    )
  }
}
