import React, { useState } from 'react'
import classNames from 'classnames'
import { type AppTheme, useAppTheme } from 'libs/appTheme'

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

type InteractionState = 'idle' | 'hover' | 'active'

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
    const { wh, pad } = SIZE_MAP[controlSize]
    const [interaction, setInteraction] = useState<InteractionState>('idle')

    const colorStyles = getColorStyles(tone, theme)

    const resolvedColor = disabled
      ? colorStyles.disabledColor
      : interaction === 'active'
        ? colorStyles.activeColor
        : interaction === 'hover'
          ? colorStyles.hoverColor
          : colorStyles.color

    const resolvedBg =
      !disabled && interaction === 'active'
        ? colorStyles.activeBg
        : !disabled && interaction === 'hover'
          ? colorStyles.hoverBg
          : undefined

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={classNames(
          'inline-flex items-center justify-center rounded-full border-0 bg-transparent shrink-0 focus:outline-none focus:ring transition-[color,background-color,transform] ease-out active:scale-[0.97] disabled:active:scale-100 motion-reduce:transform-none motion-reduce:transition-none motion-reduce:active:scale-100',
          { 'cursor-not-allowed': disabled },
          className,
        )}
        style={{
          width: wh,
          height: wh,
          minWidth: wh,
          minHeight: wh,
          padding: pad,
          color: resolvedColor,
          backgroundColor: resolvedBg,
          opacity: disabled ? colorStyles.disabledOpacity : 1,
          transitionDuration: `${theme.transitions.shorter}ms`,
          ...style,
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            setInteraction('hover')
          }
          rest.onMouseEnter?.(e)
        }}
        onMouseLeave={(e) => {
          setInteraction('idle')
          rest.onMouseLeave?.(e)
        }}
        onMouseDown={(e) => {
          if (!disabled) {
            setInteraction('active')
          }
          rest.onMouseDown?.(e)
        }}
        onMouseUp={(e) => {
          if (!disabled) {
            setInteraction('hover')
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

function getColorStyles(tone: Tone, theme: AppTheme) {
  if (tone === 'danger') {
    return theme.palette.danger
  }
  return {
    color: theme.app.icon.default,
    hoverColor: theme.palette.text.primary,
    hoverBg: theme.palette.action.hover,
    activeColor: theme.palette.text.primary,
    activeBg: theme.palette.action.selected,
    disabledColor: theme.palette.action.disabled,
    disabledOpacity: 0.72,
  }
}
