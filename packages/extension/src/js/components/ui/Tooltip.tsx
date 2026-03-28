import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { clampOverlayPosition } from './overlayPosition'

let activeUncontrolledTooltipHide: null | { current: () => void } = null

export interface TooltipProps {
  title: React.ReactNode
  children: React.ReactElement
  open?: boolean
  placement?: 'top' | 'bottom' | 'left' | 'right'
  enterDelay?: number
  /** If true, the tooltip ignores pointer events. */
  disableInteractive?: boolean
}

/**
 * Local tooltip replacing MUI `Tooltip`.
 * Renders a portal-based tooltip on hover/focus after an optional delay.
 */
export default function Tooltip({
  title,
  children,
  open,
  placement = 'bottom',
  enterDelay = 0,
  disableInteractive = true,
}: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const anchorRef = useRef<HTMLElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const isControlled = open !== undefined
  const isVisible = isControlled ? open : visible
  const hideRef = useRef<() => void>(() => {})

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    if (isControlled) return
    setVisible(false)
    if (activeUncontrolledTooltipHide === hideRef) {
      activeUncontrolledTooltipHide = null
    }
  }, [isControlled])
  hideRef.current = hide

  const show = useCallback(() => {
    if (isControlled) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (
        activeUncontrolledTooltipHide &&
        activeUncontrolledTooltipHide !== hideRef
      ) {
        activeUncontrolledTooltipHide.current()
      }
      setVisible(true)
      activeUncontrolledTooltipHide = hideRef
    }, enterDelay)
  }, [enterDelay, isControlled])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (activeUncontrolledTooltipHide === hideRef) {
        activeUncontrolledTooltipHide = null
      }
    },
    [],
  )

  const updatePosition = useCallback(() => {
    if (!isVisible || !anchorRef.current || !tooltipRef.current) {
      return
    }

    const rect = anchorRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const gap = 8
    let top = 0
    let left = 0

    switch (placement) {
      case 'top':
        top = rect.top - tooltipRect.height - gap
        left = rect.left + rect.width / 2 - tooltipRect.width / 2
        break
      case 'bottom':
        top = rect.bottom + gap
        left = rect.left + rect.width / 2 - tooltipRect.width / 2
        break
      case 'left':
        top = rect.top + rect.height / 2 - tooltipRect.height / 2
        left = rect.left - tooltipRect.width - gap
        break
      case 'right':
        top = rect.top + rect.height / 2 - tooltipRect.height / 2
        left = rect.right + gap
        break
    }

    setCoords(
      clampOverlayPosition({
        top,
        left,
        width: tooltipRect.width,
        height: tooltipRect.height,
        margin: 8,
      }),
    )
  }, [isVisible, placement])

  useLayoutEffect(() => {
    updatePosition()
  }, [title, updatePosition])

  useEffect(() => {
    if (!isVisible) {
      return
    }

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isVisible, updatePosition])

  if (!title) {
    return children
  }

  // React 18 exposes .ref as a non-public runtime field not in TS types.
  type ReactElementWithRef = React.ReactElement & {
    ref?: React.Ref<HTMLElement>
  }
  const child = React.Children.only(children) as ReactElementWithRef
  const childRef = child.ref

  const mergedRef = (node: HTMLElement | null) => {
    anchorRef.current = node
    if (typeof childRef === 'function') {
      childRef(node)
    } else if (childRef && typeof childRef === 'object') {
      ;(childRef as React.MutableRefObject<HTMLElement | null>).current = node
    }
  }

  const cloned = React.cloneElement(
    child as React.ReactElement<React.HTMLAttributes<HTMLElement>>,
    {
      ref: mergedRef,
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
        show()
        child.props.onMouseEnter?.(e)
      },
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
        hide()
        child.props.onMouseLeave?.(e)
      },
      onFocus: (e: React.FocusEvent<HTMLElement>) => {
        show()
        child.props.onFocus?.(e)
      },
      onBlur: (e: React.FocusEvent<HTMLElement>) => {
        hide()
        child.props.onBlur?.(e)
      },
    } as React.RefAttributes<HTMLElement> & React.HTMLAttributes<HTMLElement>,
  )
  return (
    <>
      {cloned}
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform: 'none',
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
