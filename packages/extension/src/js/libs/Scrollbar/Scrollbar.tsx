import React, { useEffect, useRef } from 'react'
import { SpringSystem } from 'rebound'
import { ScrollbarContext } from './useScrollbar'

export default (props) => {
  const { scrollbarRef, children } = props
  const verticalSpring = useRef(null)
  const horizontalSpring = useRef(null)

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
    <ScrollbarContext.Provider value={{ scrollbarRef }}>
      <div
        ref={scrollbarRef}
        className="flex flex-col flex-wrap content-start flex-auto mb-0 mr-0 overflow-scroll"
      >
        {children}
      </div>
    </ScrollbarContext.Provider>
  )
}
