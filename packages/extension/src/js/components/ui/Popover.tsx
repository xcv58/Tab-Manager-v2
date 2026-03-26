import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useAppTheme } from 'libs/appTheme'
import { clampOverlayPosition } from './overlayPosition'

export interface PopoverProps {
  open: boolean
  anchorEl: HTMLElement | null
  onClose: () => void
  children: React.ReactNode
  anchorOrigin?: {
    vertical: 'top' | 'bottom'
    horizontal: 'left' | 'right' | 'center'
  }
  style?: React.CSSProperties
  className?: string
  'data-testid'?: string
}

/**
 * Local popover replacing MUI `Popover`.
 * Portal-based overlay anchored to a reference element.
 */
export default function Popover({
  open,
  anchorEl,
  onClose,
  children,
  anchorOrigin = { vertical: 'bottom', horizontal: 'left' },
  style,
  className,
  'data-testid': testId,
}: PopoverProps) {
  const theme = useAppTheme()
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const updatePosition = useCallback(() => {
    if (!open || !anchorEl || !popoverRef.current) {
      return
    }

    const rect = anchorEl.getBoundingClientRect()
    const popoverRect = popoverRef.current.getBoundingClientRect()
    const top = anchorOrigin.vertical === 'bottom' ? rect.bottom : rect.top
    let left: number

    if (anchorOrigin.horizontal === 'right') {
      left = rect.right
    } else if (anchorOrigin.horizontal === 'center') {
      left = rect.left + rect.width / 2
    } else {
      left = rect.left
    }

    setPosition(
      clampOverlayPosition({
        top,
        left,
        width: popoverRect.width,
        height: popoverRect.height,
        margin: 16,
      }),
    )
  }, [anchorEl, anchorOrigin.horizontal, anchorOrigin.vertical, open])

  useLayoutEffect(() => {
    updatePosition()
  }, [children, style, updatePosition])

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    },
    [onClose],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, handleClickOutside, handleKeyDown, updatePosition])

  if (!open) return null

  return createPortal(
    <div
      ref={popoverRef}
      data-testid={testId}
      className={className}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: theme.zIndex.popover,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)',
        minWidth: 160,
        overflow: 'auto',
        maxHeight: 'calc(100vh - 32px)',
        ...style,
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
