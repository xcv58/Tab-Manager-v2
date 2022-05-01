import React from 'react'
import classNames from 'classnames'

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
    <button
      {...restProps}
      {...{
        onClick,
        disabled,
      }}
      className={classNames(
        'inline-flex justify-center w-8 h-8 m-2 text-xl text-red-200 bg-transparent rounded-full disabled:opacity-75',
        {
          'hover:text-red-500 hover:bg-red-100 focus:outline-none focus:ring active:bg-red-300 active:text-red-700':
            !disabled,
          'cursor-not-allowed': disabled,
        }
      )}
    >
      x
    </button>
  )
}

export default CloseButton
