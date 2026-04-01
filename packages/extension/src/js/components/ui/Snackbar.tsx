import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface SnackbarProps {
  open: boolean
  message: React.ReactNode
  anchorOrigin?: {
    vertical: 'top' | 'bottom'
    horizontal: 'left' | 'center' | 'right'
  }
  transitionDuration?: number | { enter: number; exit: number }
  'data-testid'?: string
}

/**
 * Local snackbar replacing MUI `Snackbar`.
 * Fixed-position toast with a fade transition.
 */
export default function Snackbar({
  open,
  message,
  anchorOrigin = { vertical: 'bottom', horizontal: 'center' },
  transitionDuration = 225,
  'data-testid': testId,
}: SnackbarProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enterMs =
    typeof transitionDuration === 'number'
      ? transitionDuration
      : transitionDuration.enter
  const exitMs =
    typeof transitionDuration === 'number'
      ? transitionDuration
      : transitionDuration.exit

  useEffect(() => {
    if (open) {
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
  }, [open, exitMs])

  if (!mounted) return null

  const positionStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1400,
    display: 'flex',
    justifyContent: 'center',
    ...(anchorOrigin.vertical === 'bottom' ? { bottom: 24 } : { top: 24 }),
    ...(anchorOrigin.horizontal === 'center'
      ? { left: '50%', transform: 'translateX(-50%)' }
      : anchorOrigin.horizontal === 'right'
        ? { right: 24 }
        : { left: 24 }),
  }

  return createPortal(
    <div
      role="alert"
      data-testid={testId}
      style={{
        ...positionStyle,
        opacity: visible ? 1 : 0,
        transition: `opacity ${visible ? enterMs : exitMs}ms ease`,
      }}
    >
      <div
        style={{
          backgroundColor: '#323232',
          color: '#fff',
          padding: '6px 16px',
          borderRadius: 4,
          fontSize: '0.875rem',
          lineHeight: 1.43,
          boxShadow:
            '0 3px 5px -1px rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.14)',
        }}
      >
        {message}
      </div>
    </div>,
    document.body,
  )
}
