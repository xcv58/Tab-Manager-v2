import React from 'react'
import classNames from 'classnames'
import { useAppTheme } from 'libs/appTheme'

type Tone = 'default' | 'danger'
type ControlSize = 'default' | 'medium' | 'compact'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone
  controlSize?: ControlSize
}

const SIZE_MAP: Record<ControlSize, { wh: number; pad: number }> = {
  default: { wh: 30, pad: 5 }, // DEFAULT_CONTROL_SIZE=30, p: 0.625 * 8 = 5
  medium: { wh: 34, pad: 6 }, // p: 0.75 * 8 = 6
  compact: { wh: 28, pad: 3 }, // p: 0.375 * 8 = 3
}

/**
 * Local icon button replacing MUI `IconButton`.
 * Applies the same sizing, hover, focus, and disabled styles.
 */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      children,
      className,
      style,
      tone = 'default',
      controlSize = 'default',
      disabled,
      ...rest
    },
    ref,
  ) => {
    const theme = useAppTheme()
    const isDark = theme.mode === 'dark'
    const { wh, pad } = SIZE_MAP[controlSize]

    const colorStyles = getColorStyles(tone, isDark, theme)

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={classNames(
          'inline-flex items-center justify-center rounded-full border-0 bg-transparent shrink-0 focus:outline-none focus:ring transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] disabled:active:scale-100 motion-reduce:transform-none motion-reduce:transition-none motion-reduce:active:scale-100',
          { 'cursor-not-allowed': disabled },
          className,
        )}
        style={{
          width: wh,
          height: wh,
          minWidth: wh,
          minHeight: wh,
          padding: pad,
          color: disabled ? colorStyles.disabledColor : colorStyles.color,
          opacity: disabled ? colorStyles.disabledOpacity : 1,
          ...style,
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            const t = e.currentTarget
            t.style.color = colorStyles.hoverColor
            t.style.backgroundColor = colorStyles.hoverBg
          }
          rest.onMouseEnter?.(e)
        }}
        onMouseLeave={(e) => {
          const t = e.currentTarget
          t.style.color = disabled
            ? colorStyles.disabledColor
            : colorStyles.color
          t.style.backgroundColor = 'transparent'
          rest.onMouseLeave?.(e)
        }}
        onMouseDown={(e) => {
          if (!disabled) {
            const t = e.currentTarget
            t.style.color = colorStyles.activeColor
            t.style.backgroundColor = colorStyles.activeBg
          }
          rest.onMouseDown?.(e)
        }}
        onMouseUp={(e) => {
          if (!disabled) {
            const t = e.currentTarget
            t.style.color = colorStyles.hoverColor
            t.style.backgroundColor = colorStyles.hoverBg
          }
          rest.onMouseUp?.(e)
        }}
        {...rest}
      >
        {children}
      </button>
    )
  },
)

IconButton.displayName = 'IconButton'

export default IconButton

function getColorStyles(tone: Tone, isDark: boolean, theme: any) {
  if (tone === 'danger') {
    return {
      color: isDark ? 'rgba(252, 202, 202, 0.7)' : 'rgba(239, 68, 68, 0.36)',
      hoverColor: isDark ? '#fecaca' : '#ef4444',
      hoverBg: isDark ? 'rgba(239, 68, 68, 0.14)' : 'rgba(239, 68, 68, 0.12)',
      activeColor: isDark ? '#fee2e2' : '#b91c1c',
      activeBg: 'rgba(239, 68, 68, 0.2)',
      disabledColor: isDark
        ? 'rgba(252, 202, 202, 0.54)'
        : 'rgba(239, 68, 68, 0.28)',
      disabledOpacity: 0.75,
    }
  }
  return {
    color: isDark ? 'rgba(203, 213, 225, 0.74)' : 'rgba(71, 85, 105, 0.76)',
    hoverColor: theme.palette.text.primary,
    hoverBg: theme.palette.action.hover,
    activeColor: theme.palette.text.primary,
    activeBg: theme.palette.action.selected,
    disabledColor: theme.palette.action.disabled,
    disabledOpacity: 0.72,
  }
}
