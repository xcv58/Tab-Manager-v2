import React from 'react'
import { useAppTheme } from 'libs/appTheme'
import { useStore } from 'components/hooks/useStore'

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
  const { userStore } = useStore()
  const [focused, setFocused] = React.useState(false)
  const isSmall = size === 'small'
  const trackW = isSmall ? 34 : 42
  const trackH = isSmall ? 18 : 22
  const thumbSize = isSmall ? 14 : 18
  const thumbOffset = 2
  const increaseContrast = userStore?.increaseContrast ?? false
  const checkedTrackColor = increaseContrast
    ? theme.mode === 'dark'
      ? '#d8e4f7'
      : '#1a73e8'
    : theme.palette.primary.main
  const uncheckedTrackColor = increaseContrast
    ? theme.mode === 'dark'
      ? 'rgba(226, 232, 240, 0.5)'
      : 'rgba(30, 41, 59, 0.5)'
    : theme.palette.action.disabled
  const thumbColor =
    increaseContrast && theme.mode === 'dark' && checked ? '#1f242b' : '#fff'
  const focusRingColor = increaseContrast
    ? theme.mode === 'dark'
      ? 'rgba(216, 228, 247, 0.38)'
      : 'rgba(26, 115, 232, 0.32)'
    : `${theme.palette.primary.main}3d`

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
          backgroundColor: checked ? checkedTrackColor : uncheckedTrackColor,
          transition: 'background-color 150ms ease',
          position: 'relative',
          boxShadow: focused ? `0 0 0 3px ${focusRingColor}` : 'none',
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
            backgroundColor: thumbColor,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transition: 'left 150ms ease',
          }}
        />
      </span>
    </label>
  )
}
