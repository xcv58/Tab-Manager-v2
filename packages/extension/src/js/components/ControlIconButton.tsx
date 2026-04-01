import React from 'react'
import IconButton, { IconButtonProps } from 'components/ui/IconButton'
import classNames from 'classnames'

type Tone = 'default' | 'danger'
type ControlSize = 'default' | 'medium' | 'compact'

type Props = IconButtonProps & {
  tone?: Tone
  controlSize?: ControlSize
}

const ControlIconButton = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      children,
      className,
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
      tone={tone}
      controlSize={controlSize}
    >
      {children}
    </IconButton>
  ),
)

ControlIconButton.displayName = 'ControlIconButton'

export default ControlIconButton
