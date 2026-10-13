import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { OverlayContainerContext } from './OverlayContainer'
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
  /** Keep an interactive panel in place when only its contents change size. */
  keepPosition?: boolean
  onInteractionStart?: () => void
  onInteractionEnd?: (nextTarget: EventTarget | null) => void
  onClose?: () => void
  style?: React.CSSProperties
  role?: 'tooltip' | 'dialog'
  'aria-label'?: string
  'data-testid'?: string
  'data-tab-details-panel'?: boolean
  id?: string
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
  keepPosition = false,
  onInteractionStart,
  onInteractionEnd,
  onClose,
  style,
  role = 'tooltip',
  'aria-label': ariaLabel,
  'data-testid': testId,
  'data-tab-details-panel': tabDetailsPanel,
  id,
}: TooltipProps) {
  const overlayContainer = useContext(OverlayContainerContext)
  const selectingRef = useRef(false)
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const anchorRef = useRef<HTMLElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const positionRef = useRef<{
    anchor: string
    top: number
    left: number
    bottom: number
  } | null>(null)
  const [side, setSide] = useState(placement)
  const interactionRef = useRef({
    onInteractionStart,
    onInteractionEnd,
    onClose,
  })
  interactionRef.current = { onInteractionStart, onInteractionEnd, onClose }
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
    if (
      !disableInteractive &&
      (!anchorRef.current.isConnected ||
        rect.bottom < 0 ||
        rect.top > window.innerHeight)
    ) {
      interactionRef.current.onClose?.()
      return
    }
    const anchorKey = [
      rect.top,
      rect.left,
      rect.width,
      rect.height,
      window.innerWidth,
      window.innerHeight,
    ].join(':')
    if (keepPosition && positionRef.current?.anchor === anchorKey) {
      const next = clampOverlayPosition({
        top:
          side === 'top'
            ? positionRef.current.bottom - tooltipRect.height
            : positionRef.current.top,
        left: positionRef.current.left,
        width: tooltipRect.width,
        height: tooltipRect.height,
        margin: 8,
      })
      setCoords(next)
      return
    }
    const gap = 8
    const resolvedPlacement =
      !disableInteractive &&
      placement === 'bottom' &&
      rect.bottom + gap + tooltipRect.height > window.innerHeight &&
      rect.top > window.innerHeight - rect.bottom
        ? 'top'
        : placement
    setSide(resolvedPlacement)
    let top = 0
    let left = 0

    switch (resolvedPlacement) {
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

    const next = clampOverlayPosition({
      top,
      left,
      width: tooltipRect.width,
      height: tooltipRect.height,
      margin: 8,
    })
    positionRef.current = {
      anchor: anchorKey,
      top,
      left,
      bottom: top + tooltipRect.height,
    }
    setCoords(next)
  }, [isVisible, placement, disableInteractive, keepPosition, side])

  useLayoutEffect(() => {
    if (!isVisible) {
      positionRef.current = null
      selectingRef.current = false
    }
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

  useEffect(() => {
    if (!isVisible || disableInteractive) return
    const node = tooltipRef.current
    const anchor = anchorRef.current
    const dismiss = () => {
      const restoreFocus = node?.contains(document.activeElement)
      interactionRef.current.onClose?.()
      if (restoreFocus) anchorRef.current?.focus()
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.type === 'keyup') dismiss()
    }
    const onOutsidePress = (event: MouseEvent) => {
      if (
        !node?.contains(event.target as Node) &&
        !anchorRef.current?.contains(event.target as Node)
      )
        interactionRef.current.onClose?.()
    }
    const onPointerRelease = () => {
      if (!selectingRef.current) return
      selectingRef.current = false
      const selection = window.getSelection()
      if (
        selection &&
        !selection.isCollapsed &&
        node?.contains(selection.anchorNode)
      )
        return
      if (!node?.contains(document.activeElement) && !node?.matches(':hover'))
        interactionRef.current.onInteractionEnd?.(null)
    }
    const onWindowBlur = () => interactionRef.current.onClose?.()
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updatePosition)
    if (node) observer?.observe(node)
    document.addEventListener('keydown', onEscape, true)
    document.addEventListener('keyup', onEscape, true)
    document.addEventListener('mousedown', onOutsidePress, true)
    document.addEventListener('mouseup', onPointerRelease, true)
    window.addEventListener('blur', onWindowBlur)
    return () => {
      observer?.disconnect()
      document.removeEventListener('keydown', onEscape, true)
      document.removeEventListener('keyup', onEscape, true)
      document.removeEventListener('mousedown', onOutsidePress, true)
      document.removeEventListener('mouseup', onPointerRelease, true)
      window.removeEventListener('blur', onWindowBlur)
      if (!anchor?.isConnected) interactionRef.current.onClose?.()
    }
  }, [isVisible, disableInteractive, updatePosition])

  if (!title) {
    // Keep the anchor in the same React tree when controlled content mounts.
    return <>{children}</>
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
            id={id}
            role={role}
            aria-label={ariaLabel}
            data-testid={testId}
            data-tab-details-panel={tabDetailsPanel ? '' : undefined}
            onMouseEnter={
              disableInteractive
                ? undefined
                : () => interactionRef.current.onInteractionStart?.()
            }
            onMouseLeave={
              disableInteractive
                ? undefined
                : (event) => {
                    if (
                      !selectingRef.current &&
                      !tooltipRef.current?.contains(document.activeElement)
                    )
                      interactionRef.current.onInteractionEnd?.(
                        event.relatedTarget,
                      )
                  }
            }
            onFocusCapture={
              disableInteractive
                ? undefined
                : () => interactionRef.current.onInteractionStart?.()
            }
            onBlurCapture={
              disableInteractive
                ? undefined
                : (event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node,
                      ) &&
                      !event.currentTarget.matches(':hover')
                    )
                      interactionRef.current.onInteractionEnd?.(
                        event.relatedTarget,
                      )
                  }
            }
            onKeyDown={
              disableInteractive
                ? undefined
                : (event) => {
                    if (event.key !== 'Tab' || !overlayContainer)
                      event.stopPropagation()
                  }
            }
            onKeyUp={
              disableInteractive
                ? undefined
                : (event) => event.stopPropagation()
            }
            onClick={
              disableInteractive
                ? undefined
                : (event) => event.stopPropagation()
            }
            onMouseDown={
              disableInteractive
                ? undefined
                : (event) => {
                    selectingRef.current = true
                    interactionRef.current.onInteractionStart?.()
                    event.stopPropagation()
                  }
            }
            onAuxClick={
              disableInteractive
                ? undefined
                : (event) => event.stopPropagation()
            }
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
              ...style,
            }}
          >
            {!disableInteractive && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  width: '100%',
                  height: 8,
                  ...(side === 'top' ? { top: '100%' } : { bottom: '100%' }),
                }}
              />
            )}
            {title}
          </div>,
          overlayContainer || document.body,
        )}
    </>
  )
}
