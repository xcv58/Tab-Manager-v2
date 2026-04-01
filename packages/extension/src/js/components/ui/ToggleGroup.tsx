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
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>
  style?: React.CSSProperties
  className?: string
  tabIndex?: number
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
  const buttonRefs = React.useRef<Array<HTMLButtonElement | null>>([])
  const childElements = React.Children.toArray(children).filter(
    React.isValidElement<ToggleButtonProps>,
  ) as React.ReactElement<ToggleButtonProps>[]
  const selectedIndex = childElements.findIndex(
    (child) => child.props.value === value,
  )
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : 0

  const focusButton = React.useCallback(
    (index: number) => {
      const total = childElements.length
      if (!total) {
        return
      }

      const normalizedIndex = ((index % total) + total) % total
      buttonRefs.current[normalizedIndex]?.focus()
    },
    [childElements.length],
  )

  const selectValueAtIndex = React.useCallback(
    (index: number) => {
      const total = childElements.length
      if (!total) {
        return
      }

      const normalizedIndex = ((index % total) + total) % total
      const nextChild = childElements[normalizedIndex]
      const nextValue = nextChild?.props.value

      if (nextValue != null && nextValue !== value) {
        onChange(nextValue)
      }
    },
    [childElements, onChange, value],
  )

  const handleKeyboardSelection = React.useCallback(
    (currentIndex: number, nextIndex: number) => {
      selectValueAtIndex(nextIndex)
      focusButton(nextIndex)
    },
    [focusButton, selectValueAtIndex],
  )

  return (
    <div
      role="radiogroup"
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
      {childElements.map((child, index) => {
        return React.cloneElement(child, {
          ref: (node: HTMLButtonElement | null) => {
            buttonRefs.current[index] = node
          },
          selected: child.props.value === value,
          tabIndex: index === tabbableIndex ? 0 : -1,
          onClick: () => {
            const nextValue = child.props.value
            if (nextValue !== value) {
              onChange(nextValue)
            }
          },
          onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
              event.preventDefault()
              handleKeyboardSelection(index, index + 1)
              return
            }

            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
              event.preventDefault()
              handleKeyboardSelection(index, index - 1)
              return
            }

            if (event.key === 'Home') {
              event.preventDefault()
              handleKeyboardSelection(index, 0)
              return
            }

            if (event.key === 'End') {
              event.preventDefault()
              handleKeyboardSelection(index, childElements.length - 1)
            }
          },
        } as any)
      })}
    </div>
  )
}

/**
 * Individual toggle button — rendered by ToggleGroup.
 */
export const ToggleButton = React.forwardRef<
  HTMLButtonElement,
  ToggleButtonProps
>(function ToggleButton(
  {
    children,
    'aria-label': ariaLabel,
    selected,
    onClick,
    onKeyDown,
    style,
    className,
    tabIndex,
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`transition-[background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none motion-reduce:active:scale-100 ${
        className || ''
      }`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
})
