import React from 'react'
import IconButton from '@mui/material/IconButton'
import type { IconButtonProps } from '@mui/material/IconButton'
import { SxProps, Theme } from '@mui/material/styles'
import classNames from 'classnames'

type Tone = 'default' | 'danger'

type Props = Omit<IconButtonProps, 'color'> & {
  tone?: Tone
}

const BASE_CONTROL_SX: SxProps<Theme> = {
  width: 40,
  height: 40,
  minWidth: 40,
  minHeight: 40,
  p: 1,
  m: 0,
}

const DANGER_CONTROL_SX: SxProps<Theme> = {
  color: '#fecaca',
  '&:hover': {
    color: '#ef4444',
    backgroundColor: '#fee2e2',
  },
  '&:active': {
    color: '#b91c1c',
    backgroundColor: '#fca5a5',
  },
  '&.Mui-disabled': {
    color: '#fecaca',
    cursor: 'not-allowed',
    opacity: 0.75,
  },
}

const ControlIconButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ children, className, sx, tone = 'default', ...iconButtonProps }, ref) => (
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
        BASE_CONTROL_SX,
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
