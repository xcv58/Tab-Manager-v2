import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useAppTheme } from 'libs/appTheme'
import { OverlayContainerContext } from './OverlayContainer'
import { clampOverlayPosition } from './overlayPosition'

/* -------------------------------------------------------------------------- */
/*  Menu (replaces MUI Menu)                                                   */
/* -------------------------------------------------------------------------- */

export interface MenuProps {
  open: boolean
  anchorEl: HTMLElement | null
  anchorPosition?: { top: number; left: number }
  restoreFocus?: boolean | (() => boolean)
  onClose: () => void
  children: React.ReactNode
  style?: React.CSSProperties
  'data-testid'?: string
}

export default function Menu({
  open,
  anchorEl,
  anchorPosition,
  restoreFocus = true,
  onClose,
  children,
  style,
  'data-testid': testId,
}: MenuProps) {
  const theme = useAppTheme()
  const overlayContainer = useContext(OverlayContainerContext)
  const toolbar = anchorEl?.closest<HTMLElement>('.corner-dock')
  const toolbarRadius = toolbar
    ? getComputedStyle(toolbar).borderTopLeftRadius
    : '0px'
  const menuRef = useRef<HTMLDivElement>(null)
  const wasOpenRef = useRef(false)
  const lastAnchorRef = useRef<HTMLElement | null>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const updatePosition = useCallback(() => {
    if (!open || !anchorEl || !menuRef.current) {
      return
    }

    lastAnchorRef.current = anchorEl
    const anchorRect = anchorEl.getBoundingClientRect()
    const dock = anchorEl.closest<HTMLElement>('.corner-dock')
    const dockRect = dock?.getBoundingClientRect()
    // Apply the current height constraint before measuring, including after
    // a resize. Measuring under the old constraint can place a grown menu
    // below its dock or outside the viewport.
    if (dockRect)
      menuRef.current.style.maxHeight = `${Math.max(0, dockRect.top)}px`
    const menuRect = menuRef.current.getBoundingClientRect()
    const nextPosition = clampOverlayPosition({
      top: dockRect
        ? dockRect.top - menuRect.height
        : (anchorPosition?.top ?? anchorRect.bottom),
      left: dockRect
        ? window.innerWidth - menuRect.width
        : (anchorPosition?.left ?? anchorRect.left),
      width: menuRect.width,
      height: menuRect.height,
      margin: dockRect ? 0 : 16,
    })
    setPosition((current) =>
      current.top === nextPosition.top && current.left === nextPosition.left
        ? current
        : nextPosition,
    )
  }, [anchorEl, anchorPosition, open])

  useLayoutEffect(() => {
    updatePosition()
  }, [updatePosition])

  useEffect(() => {
    if (!open) {
      if (
        wasOpenRef.current &&
        (typeof restoreFocus === 'function' ? restoreFocus() : restoreFocus) &&
        lastAnchorRef.current?.isConnected
      ) {
        lastAnchorRef.current.focus({ preventScroll: true })
      }
      wasOpenRef.current = false
      return
    }

    wasOpenRef.current = true
    const enabledItems = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ) || [],
    )
    const focusTarget = enabledItems[0] ?? menuRef.current
    focusTarget?.focus()
  }, [open, restoreFocus])

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
        e.stopPropagation()
        // Keep the menu present through key release, consuming the full press.
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
        e.stopPropagation()
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
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updatePosition)
    if (menuRef.current) observer?.observe(menuRef.current)
    const dock = anchorEl?.closest<HTMLElement>('.corner-dock')
    if (dock) observer?.observe(dock)
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, {
      capture: true,
      passive: true,
    })
    return () => {
      observer?.disconnect()
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, {
        capture: true,
      })
    }
  }, [open, handleClickOutside, updatePosition, anchorEl])

  if (!open) return null

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      data-testid={testId}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={handleKeyDown}
      onKeyUp={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
      }}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: theme.zIndex.popover,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderRadius: toolbar ? toolbarRadius + ' 0 0 0' : 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)',
        minWidth: 160,
        paddingTop: 8,
        paddingBottom: 8,
        overflow: 'auto',
        maxHeight: toolbar ? undefined : 'calc(100vh - 32px)',
        maxWidth: toolbar
          ? 'min(30rem, 100vw)'
          : 'min(30rem, calc(100vw - 32px))',
        outline: 'none',
        ...style,
      }}
    >
      {children}
    </div>,
    overlayContainer || document.body,
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
  'aria-keyshortcuts'?: string
  'aria-label'?: string
  className?: string
  style?: React.CSSProperties
}

export function MenuItem({
  children,
  onClick,
  disabled,
  'data-testid': testId,
  'aria-keyshortcuts': ariaKeyShortcuts,
  'aria-label': ariaLabel,
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
      aria-keyshortcuts={ariaKeyShortcuts}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`action-menu-item ${className || ''}`}
      style={{
        display: 'flex',
        width: '100%',
        minWidth: 0,
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
        overflowWrap: 'anywhere',
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

export function MenuSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-2 pb-1 text-xs font-semibold opacity-70">
      {children}
    </div>
  )
}
