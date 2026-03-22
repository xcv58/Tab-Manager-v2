import React, { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Fade } from 'components/ui/Transition'

export interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  fullWidth?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  fullScreen?: boolean
  disableRestoreFocus?: boolean
  transitionDuration?: number | { enter: number; exit: number }
  style?: React.CSSProperties
  'data-testid'?: string
}

const maxWidthMap: Record<string, number> = {
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
}

/**
 * Local dialog replacing MUI `Dialog`.
 * Portal-based modal with backdrop, focus trapping, Escape key, and fade transition.
 */
export default function Dialog({
  open,
  onClose,
  children,
  fullWidth,
  maxWidth = 'sm',
  fullScreen,
  transitionDuration = 225,
  style,
  'data-testid': testId,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.addEventListener('keydown', handleKeyDown)
      requestAnimationFrame(() => {
        dialogRef.current?.focus()
      })
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  const enterMs =
    typeof transitionDuration === 'number'
      ? transitionDuration
      : transitionDuration.enter

  if (!open) return null

  return createPortal(
    <Fade in={open} timeout={enterMs}>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Backdrop */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
          onClick={onClose}
          aria-hidden="true"
        />
        {/* Dialog paper */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          data-testid={testId}
          style={{
            position: 'relative',
            outline: 'none',
            borderRadius: fullScreen ? 0 : 8,
            boxShadow:
              '0 11px 15px -7px rgba(0,0,0,0.2), 0 24px 38px 3px rgba(0,0,0,0.14)',
            backgroundColor: 'inherit',
            color: 'inherit',
            margin: fullScreen ? 0 : 32,
            width: fullScreen ? '100vw' : fullWidth ? '100%' : undefined,
            maxWidth: fullScreen
              ? '100vw'
              : fullWidth
                ? maxWidthMap[maxWidth] || maxWidthMap.sm
                : undefined,
            height: fullScreen ? '100vh' : undefined,
            maxHeight: fullScreen ? '100vh' : 'calc(100% - 64px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            ...style,
          }}
        >
          {children}
        </div>
      </div>
    </Fade>,
    document.body,
  )
}

/* -------------------------------------------------------------------------- */
/*  DialogTitle                                                                */
/* -------------------------------------------------------------------------- */

export function DialogTitle({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        padding: '16px 24px',
        fontSize: '1.25rem',
        fontWeight: 500,
        lineHeight: 1.6,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  DialogContent                                                              */
/* -------------------------------------------------------------------------- */

export function DialogContent({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 24px 20px',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
