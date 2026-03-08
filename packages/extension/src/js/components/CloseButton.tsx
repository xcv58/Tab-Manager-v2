import React from 'react'
import CloseIcon from '@mui/icons-material/Close'
import ControlIconButton from 'components/ControlIconButton'

export interface CloseButtonProps {
  /**
   * Is the button disabled
   */
  disabled?: boolean
  /**
   * The click handler
   */
  onClick: React.MouseEventHandler<HTMLButtonElement>
  /**
   * Accessible label for the button
   */
  'aria-label'?: string
  /**
   * Size variant
   */
  size?: 'default' | 'compact'
}

const CloseButton: React.FC<CloseButtonProps> = (props) => {
  const {
    onClick,
    disabled,
    size = 'default',
    'aria-label': ariaLabel = 'Close',
  } = props
  return (
    <ControlIconButton
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      tone="danger"
      controlSize={size === 'compact' ? 'compact' : 'medium'}
    >
      <CloseIcon sx={{ fontSize: size === 'compact' ? 14 : 16 }} />
    </ControlIconButton>
  )
}

export default CloseButton
