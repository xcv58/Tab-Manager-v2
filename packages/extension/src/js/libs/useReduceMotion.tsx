import React, { createContext, useContext, useSyncExternalStore } from 'react'

const ReduceMotionContext = createContext(false)

/**
 * Subscribe to the prefers-reduced-motion media query using
 * window.matchMedia instead of MUI's useMediaQuery.
 */
const mediaQuery =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null

function subscribe(callback: () => void) {
  mediaQuery?.addEventListener('change', callback)
  return () => mediaQuery?.removeEventListener('change', callback)
}

function getSnapshot() {
  return mediaQuery?.matches ?? false
}

function getServerSnapshot() {
  return false
}

export const ReduceMotionProvider = (props: { children: React.ReactNode }) => {
  const reduceMotion = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )
  return (
    <ReduceMotionContext.Provider value={reduceMotion}>
      {props.children}
    </ReduceMotionContext.Provider>
  )
}

export default () => useContext(ReduceMotionContext)
