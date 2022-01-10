import React, { createContext, useContext } from 'react'
import useMediaQuery from '@mui/material/useMediaQuery'

const ReduceMotionContext = createContext(false)

export const ReduceMotionProvider = (props) => {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  return (
    <ReduceMotionContext.Provider value={reduceMotion}>
      {props.children}
    </ReduceMotionContext.Provider>
  )
}

export default () => useContext(ReduceMotionContext)
