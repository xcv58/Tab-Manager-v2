import React, { useRef, useEffect } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { SpringSystem } from 'rebound'
import { ScrollbarContext } from './useScrollbar'

export default (props) => {
  const { style, scrollbarRef, ...restProps } = props
  const _scrollbarRef = useRef(null)
  const spring = useRef(null)
  const leftSpring = useRef(null)

  const getSpringUpdateFunc = (func) => (spring) => {
    if (func && typeof func === 'function') {
      func(spring.getCurrentValue())
    }
  }

  const scrollTo = ({ top = 0, left = 0 }) => {
    if (!top && !left) {
      return
    }
    const scrollbar = _scrollbarRef.current
    if (scrollbar) {
      const scrollTop = scrollbar.getScrollTop()
      const scrollLeft = scrollbar.getScrollLeft()
      leftSpring.current.setCurrentValue(scrollLeft).setAtRest()
      leftSpring.current.setEndValue(scrollLeft + left)
      spring.current.setCurrentValue(scrollTop).setAtRest()
      spring.current.setEndValue(scrollTop + top)
    }
  }

  useEffect(() => {
    const { scrollTop, scrollLeft } = _scrollbarRef.current
    const springSystem = new SpringSystem()
    spring.current = springSystem.createSpring()
    spring.current.addListener({
      onSpringUpdate: getSpringUpdateFunc(scrollTop)
    })
    leftSpring.current = springSystem.createSpring()
    leftSpring.current.addListener({
      onSpringUpdate: getSpringUpdateFunc(scrollLeft)
    })
    return () => {
      springSystem.deregisterSpring(spring.current)
      springSystem.removeAllListeners()
      spring.current.destroy()
      leftSpring.current.destroy()
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
