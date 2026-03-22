import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/* -------------------------------------------------------------------------- */
/*  Menu (replaces MUI Menu)                                                   */
/* -------------------------------------------------------------------------- */

export interface MenuProps {
  open: boolean
  anchorEl: HTMLElement | null
  onClose: () => void
  children: React.ReactNode
  style?: React.CSSProperties
  'data-testid'?: string
}

export default function Menu({
  open,
  anchorEl,
  onClose,
  children,
  style,
  'data-testid': testId,
}: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open || !anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    setPosition({ top: rect.bottom, left: rect.left })
  }, [open, anchorEl])

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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
      ref={menuRef}
      role="menu"
      data-testid={testId}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 1300,
        backgroundColor: 'var(--popover-bg, #fff)',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)',
        minWidth: 160,
        paddingTop: 8,
        paddingBottom: 8,
        overflow: 'auto',
        maxHeight: 'calc(100vh - 32px)',
        outline: 'none',
        ...style,
      }}
    >
      {children}
    </div>,
    document.body,
  )
}

/* -------------------------------------------------------------------------- */
/*  MenuItem (replaces MUI MenuItem)                                           */
/* -------------------------------------------------------------------------- */

export interface MenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  'data-testid'?: string
  className?: string
  style?: React.CSSProperties
}

export function MenuItem({
  children,
  onClick,
  disabled,
  'data-testid': testId,
  className,
  style,
}: MenuItemProps) {
  return (
    <button
      role="menuitem"
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className={className}
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        gap: 8,
        border: 0,
        background: 'none',
        padding: '6px 16px',
        fontSize: '0.875rem',
        lineHeight: 1.5,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        textAlign: 'left',
        color: 'inherit',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  MenuDivider (replaces MUI Divider inside menus)                            */
/* -------------------------------------------------------------------------- */

export function MenuDivider() {
  return (
    <hr
      style={{
        margin: '4px 0',
        border: 'none',
        borderTop: '1px solid rgba(0,0,0,0.12)',
      }}
    />
  )
}
