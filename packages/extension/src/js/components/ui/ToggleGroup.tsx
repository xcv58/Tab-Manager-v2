import React from 'react'

export interface ToggleGroupProps {
  value: string
  onChange: (value: string | null) => void
  'aria-label'?: string
  children: React.ReactNode
  exclusive?: boolean
  style?: React.CSSProperties
  className?: string
}

export interface ToggleButtonProps {
  value: string
  children: React.ReactNode
  'aria-label'?: string
  selected?: boolean
  onClick?: () => void
  style?: React.CSSProperties
}

/**
 * Pill-shaped segmented control replacing MUI `ToggleButtonGroup`.
 * Renders children with selected state managed by parent.
 */
export function ToggleGroup({
  value,
  onChange,
  'aria-label': ariaLabel,
  children,
  style,
  className,
}: ToggleGroupProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={className}
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        borderRadius: 999,
        padding: 3,
        gap: 2,
        ...style,
      }}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement<ToggleButtonProps>(child)) return child
        return React.cloneElement(child, {
          selected: child.props.value === value,
          onClick: () => {
            const next = child.props.value
            if (next !== value) {
              onChange(next)
            }
          },
        })
      })}
    </div>
  )
}

/**
 * Individual toggle button — rendered by ToggleGroup.
 */
export function ToggleButton({
  children,
  'aria-label': ariaLabel,
  selected,
  onClick,
  style,
}: ToggleButtonProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        margin: 0,
        border: 0,
        borderRadius: 999,
        minWidth: 36,
        height: 32,
        paddingLeft: 9,
        paddingRight: 9,
        fontSize: '0.8rem',
        textTransform: 'none',
        cursor: 'pointer',
        background: 'none',
        color: 'inherit',
        transition: 'background-color 150ms, box-shadow 150ms',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
