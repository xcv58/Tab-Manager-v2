import React from 'react'
import { useAppTheme } from 'libs/appTheme'

export interface SwitchProps {
  checked: boolean
  onChange: (event?: React.ChangeEvent<HTMLInputElement>) => void
  size?: 'small' | 'medium'
  color?: string
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
  style?: React.CSSProperties
  'data-testid'?: string
}

/**
 * Local toggle switch replacing MUI `Switch`.
 * Hidden checkbox + custom track/thumb for consistent styling.
 */
export default function Switch({
  checked,
  onChange,
  size = 'medium',
  inputProps,
  style,
  'data-testid': testId,
}: SwitchProps) {
  const theme = useAppTheme()
  const [focused, setFocused] = React.useState(false)
  const isSmall = size === 'small'
  const trackW = isSmall ? 34 : 42
  const trackH = isSmall ? 18 : 22
  const thumbSize = isSmall ? 14 : 18
  const thumbOffset = 2

  return (
    <label
      data-testid={testId}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer',
        verticalAlign: 'middle',
        ...style,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...inputProps}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          margin: -1,
          padding: 0,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          border: 0,
        }}
      />
      {/* Track */}
      <span
        data-testid="switch-track"
        style={{
          width: trackW,
          height: trackH,
          borderRadius: trackH,
          backgroundColor: checked
            ? theme.palette.primary.main
            : theme.palette.action.disabled,
          transition: 'background-color 150ms ease',
          position: 'relative',
          boxShadow: focused
            ? `0 0 0 3px ${theme.palette.primary.main}3d`
            : 'none',
        }}
      >
        {/* Thumb */}
        <span
          style={{
            position: 'absolute',
            top: thumbOffset,
            left: checked ? trackW - thumbSize - thumbOffset : thumbOffset,
            width: thumbSize,
            height: thumbSize,
            borderRadius: '50%',
            backgroundColor: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transition: 'left 150ms ease',
          }}
        />
      </span>
    </label>
  )
}
