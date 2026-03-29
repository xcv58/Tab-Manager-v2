import React, { useRef, useState } from 'react'
import classNames from 'classnames'
import { useAppTheme } from 'libs/appTheme'

export interface CheckboxProps {
  checked?: boolean
  indeterminate?: boolean
  disabled?: boolean
  tabIndex?: number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  'aria-label'?: string
  className?: string
  style?: React.CSSProperties
  /** Size of the checkbox icon in px (default 20) */
  iconSize?: number
  /** Size of the outer control in px */
  controlSize?: number
  /** Padding in px */
  padding?: number
}

/**
 * Local checkbox replacing MUI `Checkbox`.
 * Renders a hidden native checkbox overlaid with an SVG icon that matches
 * the MUI primary-color visual.
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked = false,
      indeterminate = false,
      disabled = false,
      tabIndex,
      onChange,
      onClick,
      onFocus,
      onBlur,
      'aria-label': ariaLabel,
      className,
      style,
      iconSize = 20,
      controlSize = 30,
      padding = 5,
    },
    forwardedRef,
  ) => {
    const innerRef = useRef<HTMLInputElement>(null)
    const ref = (forwardedRef as React.RefObject<HTMLInputElement>) ?? innerRef
    const theme = useAppTheme()
    const [focused, setFocused] = useState(false)

    React.useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        ref.current.indeterminate = indeterminate
      }
    }, [indeterminate, ref])

    const iconColor =
      checked || indeterminate
        ? theme.palette.primary.main
        : disabled
          ? theme.palette.action.disabled
          : theme.app.icon.default

    const focusRingColor = theme.app.checkbox.focusRing

    const renderIcon = () => {
      if (indeterminate) {
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill={iconColor}
            aria-hidden="true"
          >
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z" />
          </svg>
        )
      }
      if (checked) {
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill={iconColor}
            aria-hidden="true"
          >
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        )
      }
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={iconColor}
          aria-hidden="true"
        >
          <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
        </svg>
      )
    }

    return (
      <span
        className={classNames(
          'relative inline-flex items-center justify-center shrink-0 rounded-full transition-[box-shadow]',
          { 'cursor-not-allowed opacity-60': disabled },
          className,
        )}
        style={{
          width: controlSize,
          height: controlSize,
          padding,
          transitionDuration: `${theme.transitions.shorter}ms`,
          ...(focused && !disabled
            ? { boxShadow: `0 0 0 3px ${focusRingColor}` }
            : {}),
          ...style,
        }}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          tabIndex={tabIndex}
          onChange={onChange}
          onClick={onClick}
          // Suppress React controlled-without-onChange warning; clicks
          // still work via the onClick prop when onChange is absent.
          readOnly={onChange == null}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
          aria-label={ariaLabel}
          className="absolute inset-0 m-0 cursor-pointer opacity-0"
          style={{ width: '100%', height: '100%' }}
        />
        {renderIcon()}
      </span>
    )
  },
)

Checkbox.displayName = 'Checkbox'

export default Checkbox
