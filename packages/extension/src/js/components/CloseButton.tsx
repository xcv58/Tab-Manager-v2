import React from 'react'
import { CloseIcon } from 'icons/materialIcons'
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
  tabIndex?: number
  /**
   * Size variant
   */
  size?: 'default' | 'compact'
  /**
   * Visual tone
   */
  tone?: 'default' | 'danger'
}

const CloseButton: React.FC<CloseButtonProps> = (props) => {
  const {
    onClick,
    disabled,
    size = 'default',
    tone = 'danger',
    'aria-label': ariaLabel = 'Close',
    tabIndex,
  } = props
  return (
    <ControlIconButton
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      tone={tone}
      controlSize={size === 'compact' ? 'compact' : 'medium'}
    >
      <CloseIcon fontSize={size === 'compact' ? 13 : 16} />
    </ControlIconButton>
  )
}

export default CloseButton
