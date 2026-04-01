import React, { useEffect, useRef, useState } from 'react'

/* -------------------------------------------------------------------------- */
/*  Fade                                                                       */
/* -------------------------------------------------------------------------- */

export interface FadeProps {
  in: boolean
  children: React.ReactElement
  timeout?: number | { enter: number; exit: number }
  style?: React.CSSProperties
  unmountOnExit?: boolean
}

export function Fade({
  in: show,
  children,
  timeout = 225,
  style,
  unmountOnExit,
}: FadeProps) {
  const [mounted, setMounted] = useState(show)
  const [visible, setVisible] = useState(show)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enterMs = typeof timeout === 'number' ? timeout : timeout.enter
  const exitMs = typeof timeout === 'number' ? timeout : timeout.exit

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (show) {
      setMounted(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      timerRef.current = setTimeout(() => setMounted(false), exitMs)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [show, exitMs])

  if (unmountOnExit && !mounted) return null

  return React.cloneElement(children, {
    style: {
      ...children.props.style,
      ...style,
      opacity: visible ? 1 : 0,
      transition: `opacity ${visible ? enterMs : exitMs}ms ease`,
      visibility: !mounted && !unmountOnExit ? 'hidden' : undefined,
    },
  })
}

/* -------------------------------------------------------------------------- */
/*  Slide                                                                      */
/* -------------------------------------------------------------------------- */

export interface SlideProps {
  in: boolean
  children: React.ReactElement
  direction?: 'up' | 'down' | 'left' | 'right'
  timeout?: number | { enter: number; exit: number }
  style?: React.CSSProperties
  unmountOnExit?: boolean
}

const slideOffsets: Record<string, string> = {
  up: 'translateY(100%)',
  down: 'translateY(-100%)',
  left: 'translateX(100%)',
  right: 'translateX(-100%)',
}

export function Slide({
  in: show,
  children,
  direction = 'up',
  timeout = 225,
  style,
  unmountOnExit,
}: SlideProps) {
  const [mounted, setMounted] = useState(show)
  const [visible, setVisible] = useState(show)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enterMs = typeof timeout === 'number' ? timeout : timeout.enter
  const exitMs = typeof timeout === 'number' ? timeout : timeout.exit

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (show) {
      setMounted(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      timerRef.current = setTimeout(() => setMounted(false), exitMs)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [show, exitMs])

  if (unmountOnExit && !mounted) return null

  return React.cloneElement(children, {
    style: {
      ...children.props.style,
      ...style,
      transform: visible ? 'none' : slideOffsets[direction],
      transition: `transform ${visible ? enterMs : exitMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      visibility: !mounted && !unmountOnExit ? 'hidden' : undefined,
    },
  })
}
