import React from 'react'
import IconButton from '@mui/material/IconButton'
import type { IconButtonProps } from '@mui/material/IconButton'
import { SxProps, Theme } from '@mui/material/styles'
import classNames from 'classnames'

type Tone = 'default' | 'danger'
type ControlSize = 'default' | 'medium' | 'compact'

type Props = Omit<IconButtonProps, 'color'> & {
  tone?: Tone
  controlSize?: ControlSize
}

const CONTROL_SIZES: Record<ControlSize, SxProps<Theme>> = {
  default: {
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    p: 1,
    m: 0,
  },
  medium: {
    width: 34,
    height: 34,
    minWidth: 34,
    minHeight: 34,
    p: 0.75,
    m: 0,
  },
  compact: {
    width: 28,
    height: 28,
    minWidth: 28,
    minHeight: 28,
    p: 0.375,
    m: 0,
  },
}

const DANGER_CONTROL_SX: SxProps<Theme> = (theme) => ({
  color:
    theme.palette.mode === 'dark'
      ? 'rgba(252, 202, 202, 0.84)'
      : 'rgba(239, 68, 68, 0.44)',
  '&:hover': {
    color: theme.palette.mode === 'dark' ? '#fecaca' : '#ef4444',
    backgroundColor:
      theme.palette.mode === 'dark'
        ? 'rgba(239, 68, 68, 0.14)'
        : 'rgba(239, 68, 68, 0.12)',
  },
  '&:active': {
    color: theme.palette.mode === 'dark' ? '#fee2e2' : '#b91c1c',
    backgroundColor:
      theme.palette.mode === 'dark'
        ? 'rgba(239, 68, 68, 0.2)'
        : 'rgba(239, 68, 68, 0.2)',
  },
  '&.Mui-disabled': {
    color:
      theme.palette.mode === 'dark'
        ? 'rgba(252, 202, 202, 0.54)'
        : 'rgba(239, 68, 68, 0.28)',
    cursor: 'not-allowed',
    opacity: 0.75,
  },
})

const ControlIconButton = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      children,
      className,
      sx,
      tone = 'default',
      controlSize = 'default',
      ...iconButtonProps
    },
    ref,
  ) => (
    <IconButton
      ref={ref}
      {...iconButtonProps}
      className={classNames(
        'shrink-0 focus:outline-none focus:ring',
        className,
        {
          'cursor-not-allowed': iconButtonProps.disabled,
        },
      )}
      sx={[
        CONTROL_SIZES[controlSize],
        tone === 'danger' ? DANGER_CONTROL_SX : undefined,
        sx,
      ]}
    >
      {children}
    </IconButton>
  ),
)

ControlIconButton.displayName = 'ControlIconButton'

export default ControlIconButton
