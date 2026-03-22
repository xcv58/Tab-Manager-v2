import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface TooltipProps {
  title: React.ReactNode
  children: React.ReactElement
  placement?: 'top' | 'bottom' | 'left' | 'right'
  enterDelay?: number
  /** If true, wrap children in a span (for disabled elements) */
  disableInteractive?: boolean
}

/**
 * Local tooltip replacing MUI `Tooltip`.
 * Renders a portal-based tooltip on hover/focus after an optional delay.
 */
export default function Tooltip({
  title,
  children,
  placement = 'bottom',
  enterDelay = 0,
  disableInteractive,
}: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const anchorRef = useRef<HTMLElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  const show = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setVisible(true)
    }, enterDelay)
  }, [enterDelay])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setVisible(false)
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  useEffect(() => {
    if (!visible || !anchorRef.current) return
    const el = anchorRef.current
    const rect = el.getBoundingClientRect()
    const gap = 8
    let top = 0
    let left = 0
    switch (placement) {
      case 'top':
        top = rect.top - gap
        left = rect.left + rect.width / 2
        break
      case 'bottom':
        top = rect.bottom + gap
        left = rect.left + rect.width / 2
        break
      case 'left':
        top = rect.top + rect.height / 2
        left = rect.left - gap
        break
      case 'right':
        top = rect.top + rect.height / 2
        left = rect.right + gap
        break
    }
    setCoords({ top, left })
  }, [visible, placement])

  if (!title) {
    return children
  }

  const child = React.Children.only(children)

  const cloned = React.cloneElement(child, {
    ref: (node: HTMLElement | null) => {
      anchorRef.current = node
      const childRef = (child as any).ref
      if (typeof childRef === 'function') childRef(node)
      else if (childRef && typeof childRef === 'object') childRef.current = node
    },
    onMouseEnter: (e: React.MouseEvent) => {
      show()
      child.props.onMouseEnter?.(e)
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide()
      child.props.onMouseLeave?.(e)
    },
    onFocus: (e: React.FocusEvent) => {
      show()
      child.props.onFocus?.(e)
    },
    onBlur: (e: React.FocusEvent) => {
      hide()
      child.props.onBlur?.(e)
    },
  } as any)

  const transformOrigin: Record<string, string> = {
    top: 'translateX(-50%) translateY(-100%)',
    bottom: 'translateX(-50%)',
    left: 'translateX(-100%) translateY(-50%)',
    right: 'translateY(-50%)',
  }

  return (
    <>
      {cloned}
      {visible &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform: transformOrigin[placement],
              zIndex: 1500,
              pointerEvents: disableInteractive ? 'none' : 'auto',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: '0.75rem',
              lineHeight: 1.4,
              maxWidth: 300,
              backgroundColor: 'rgba(33, 33, 33, 0.92)',
              color: '#fff',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            {title}
          </div>,
          document.body,
        )}
    </>
  )
}
