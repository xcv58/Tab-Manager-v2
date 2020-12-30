import React, { useEffect, useRef } from 'react'
import log from 'libs/log'
import { SpringSystem } from 'rebound'
import { ScrollbarContext } from './useScrollbar'
import useReduceMotion from '../useReduceMotion'

export default (props) => {
  const { scrollbarRef, children } = props
  const verticalSpring = useRef(null)
  const horizontalSpring = useRef(null)

  const reduceMotion = useReduceMotion()

  const scrollTo = ({ top = 0, left = 0 }) => {
    log.debug('scrollTo:', { top, left })
    if (
      !scrollbarRef.current ||
      !verticalSpring.current ||
      !horizontalSpring.current
    ) {
      log.debug(
        'Invalid scrollTo call, one or more internal state are not ready:',
        { scrollbarRef, verticalSpring, horizontalSpring }
      )
      return
    }
    if (!top && !left) {
      return
    }
    const { scrollTop, scrollLeft } = scrollbarRef.current
    if (reduceMotion) {
      scrollbarRef.current.scrollTop = scrollTop + top
      scrollbarRef.current.scrollLeft = scrollLeft + left
    } else {
      verticalSpring.current.setCurrentValue(scrollTop).setAtRest()
      verticalSpring.current.setEndValue(scrollTop + top)
      horizontalSpring.current.setCurrentValue(scrollLeft).setAtRest()
      horizontalSpring.current.setEndValue(scrollLeft + left)
    }
  }

  useEffect(() => {
    const springSystem = new SpringSystem()
    verticalSpring.current = springSystem.createSpring()
    verticalSpring.current.addListener({
      onSpringUpdate: (spring) => {
        scrollbarRef.current.scrollTop = spring.getCurrentValue()
      },
    })
    horizontalSpring.current = springSystem.createSpring()
    horizontalSpring.current.addListener({
      onSpringUpdate: (spring) => {
        scrollbarRef.current.scrollLeft = spring.getCurrentValue()
      },
    })
    return () => {
      springSystem.deregisterSpring(verticalSpring.current)
      springSystem.removeAllListeners()
      verticalSpring.current.destroy()
      horizontalSpring.current.destroy()
    }
  }, [])

  return (
    <ScrollbarContext.Provider value={{ scrollTo, scrollbarRef }}>
      <div
        ref={scrollbarRef}
        className="flex flex-col flex-wrap content-start flex-auto mb-0 mr-0 overflow-scroll"
      >
        {children}
      </div>
    </ScrollbarContext.Provider>
  )
}
