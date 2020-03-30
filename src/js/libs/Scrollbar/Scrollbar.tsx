import React, { useRef, useEffect } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { SpringSystem } from 'rebound'
import log from 'libs/log'
import { ScrollbarContext } from './useScrollbar'

export default (props) => {
  const { style, scrollbarRef, ...restProps } = props
  const _scrollbarRef = useRef(null)
  const verticalSpring = useRef(null)
  const horizontalSpring = useRef(null)

  const getSpringUpdateFunc = (func) => (spring) => {
    if (func && typeof func === 'function') {
      func(spring.getCurrentValue())
    }
  }

  const scrollTo = ({ top = 0, left = 0 }) => {
    log.debug('scrollTo:', { top, left })
    if (
      !_scrollbarRef.current ||
      !verticalSpring.current ||
      !horizontalSpring.current
    ) {
      log.debug(
        'Invalid scrollTo call, one or more internal state are not ready:',
        { _scrollbarRef, verticalSpring, horizontalSpring }
      )
      return
    }
    if (!top && !left) {
      return
    }
    const scrollTop = _scrollbarRef.current.getScrollTop()
    const scrollLeft = _scrollbarRef.current.getScrollLeft()
    verticalSpring.current.setCurrentValue(scrollTop).setAtRest()
    verticalSpring.current.setEndValue(scrollTop + top)
    horizontalSpring.current.setCurrentValue(scrollLeft).setAtRest()
    horizontalSpring.current.setEndValue(scrollLeft + left)
  }

  useEffect(() => {
    const springSystem = new SpringSystem()
    const { scrollTop, scrollLeft } = _scrollbarRef.current
    verticalSpring.current = springSystem.createSpring()
    verticalSpring.current.addListener({
      onSpringUpdate: getSpringUpdateFunc(scrollTop)
    })
    horizontalSpring.current = springSystem.createSpring()
    horizontalSpring.current.addListener({
      onSpringUpdate: getSpringUpdateFunc(scrollLeft)
    })
    return () => {
      springSystem.deregisterSpring(verticalSpring.current)
      springSystem.removeAllListeners()
      verticalSpring.current.destroy()
      horizontalSpring.current.destroy()
    }
  }, [])

  const containerStyle = {
    ...style,
    position: 'relative'
  }
  return (
    <ScrollbarContext.Provider value={{ scrollTo, scrollbarRef }}>
      <div ref={scrollbarRef} style={containerStyle}>
        <Scrollbars ref={_scrollbarRef} {...restProps} />
      </div>
    </ScrollbarContext.Provider>
  )
}
