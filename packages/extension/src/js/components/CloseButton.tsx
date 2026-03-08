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
}

const CloseButton: React.FC<CloseButtonProps> = (props) => {
  const { onClick, disabled, 'aria-label': ariaLabel = 'Close' } = props
  return (
    <ControlIconButton
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      tone="danger"
    >
      <CloseIcon fontSize="small" />
    </ControlIconButton>
  )
}

export default CloseButton
