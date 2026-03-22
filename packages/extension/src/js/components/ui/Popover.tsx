import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open || !anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const top = anchorOrigin.vertical === 'bottom' ? rect.bottom : rect.top
    let left: number
    if (anchorOrigin.horizontal === 'right') {
      left = rect.right
    } else if (anchorOrigin.horizontal === 'center') {
      left = rect.left + rect.width / 2
    } else {
      left = rect.left
    }
    setPosition({ top, left })
  }, [open, anchorEl, anchorOrigin.vertical, anchorOrigin.horizontal])

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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleClickOutside, handleKeyDown])

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
        zIndex: 1300,
        backgroundColor: 'var(--popover-bg, #fff)',
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
