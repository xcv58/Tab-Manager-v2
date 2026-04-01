import React from 'react'
import { useAppTheme } from 'libs/appTheme'
import classNames from 'classnames'

type Props = {
  position?: 'before' | 'after'
}

export default ({ position = 'before' }: Props) => {
  const theme = useAppTheme()
  return (
    <hr
      className={classNames('relative z-10', {
        'border-t-0 border-b-2': position === 'before',
        'border-b-0 border-t-2': position === 'after',
      })}
      style={{
        borderColor: theme.palette.primary.main,
        marginTop: position === 'before' ? -2 : 0,
        marginBottom: position === 'after' ? -2 : 0,
      }}
    />
  )
}
