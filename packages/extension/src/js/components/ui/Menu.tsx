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
  const theme = useAppTheme()
  const menuRef = useRef<HTMLDivElement>(null)
  const lastAnchorRef = useRef<HTMLElement | null>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const updatePosition = useCallback(() => {
    if (!open || !anchorEl || !menuRef.current) {
      return
    }

    lastAnchorRef.current = anchorEl
    const anchorRect = anchorEl.getBoundingClientRect()
    const menuRect = menuRef.current.getBoundingClientRect()

    setPosition(
      clampOverlayPosition({
        top: anchorRect.bottom,
        left: anchorRect.left,
        width: menuRect.width,
        height: menuRect.height,
        margin: 16,
      }),
    )
  }, [anchorEl, open])

  useLayoutEffect(() => {
    updatePosition()
  }, [children, style, updatePosition])

  useEffect(() => {
    if (!open) {
      lastAnchorRef.current?.focus()
      return
    }

    const enabledItems = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ) || [],
    )
    enabledItems[0]?.focus()
  }, [open])

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    },
    [onClose],
  )

  const focusMenuItem = useCallback((index: number) => {
    const enabledItems = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ) || [],
    )
    if (!enabledItems.length) {
      return
    }
    const boundedIndex = Math.max(0, Math.min(index, enabledItems.length - 1))
    enabledItems[boundedIndex]?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const enabledItems = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>(
          '[role="menuitem"]:not(:disabled)',
        ) || [],
      )

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (!enabledItems.length) {
        return
      }

      const currentIndex = enabledItems.findIndex(
        (item) => item === document.activeElement,
      )
      const moveFocus = (direction: number) => {
        const nextIndex =
          currentIndex >= 0
            ? (currentIndex + direction + enabledItems.length) %
              enabledItems.length
            : direction > 0
              ? 0
              : enabledItems.length - 1
        focusMenuItem(nextIndex)
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveFocus(1)
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveFocus(-1)
        return
      }

      if (e.key === 'Tab') {
        e.preventDefault()
        moveFocus(e.shiftKey ? -1 : 1)
        return
      }

      if (e.key === 'Home') {
        e.preventDefault()
        focusMenuItem(0)
        return
      }

      if (e.key === 'End') {
        e.preventDefault()
        focusMenuItem(enabledItems.length - 1)
      }
    },
    [focusMenuItem, onClose],
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, {
      capture: true,
      passive: true,
    })
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, {
        capture: true,
      })
    }
  }, [open, handleClickOutside, updatePosition])

  if (!open) return null

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      data-testid={testId}
      onKeyDown={handleKeyDown}
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
  const theme = useAppTheme()
  return (
    <button
      role="menuitem"
      type="button"
      tabIndex={-1}
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
        pointerEvents: disabled ? 'none' : undefined,
        textAlign: 'left',
        color: 'inherit',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = theme.palette.action.hover
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
  const theme = useAppTheme()
  return (
    <hr
      style={{
        margin: '4px 0',
        border: 'none',
        borderTop: `1px solid ${theme.palette.divider}`,
      }}
    />
  )
}
