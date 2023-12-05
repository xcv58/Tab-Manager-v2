import React from 'react'
import classNames from 'classnames'
import { IconButton } from '@material-tailwind/react'
export interface CloseButtonProps {
  /**
   * Is the button disabled
   */
  disabled?: boolean
  /**
   * The click handler
   */
  onClick: () => void
}

const CloseButton: React.FC<CloseButtonProps> = (props) => {
  const { onClick, disabled, ...restProps } = props
  return (
    <IconButton
      {...restProps}
      {...{
        onClick,
        disabled,
      }}
      variant="text"
      className={classNames(
        'bg-transparent rounded-full text-red-200 disabled:opacity-75',
        {
          'hover:text-red-500 hover:bg-red-100 focus:outline-none focus:ring active:bg-red-300 active:text-red-700':
            !disabled,
          'cursor-not-allowed': disabled,
        },
      )}
    >
      X
    </IconButton>
  )
}

export default CloseButton
