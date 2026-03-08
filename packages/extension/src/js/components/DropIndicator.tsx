import React from 'react'
import { useTheme } from '@mui/material/styles'
import classNames from 'classnames'

type Props = {
  position?: 'before' | 'after'
}

export default ({ position = 'before' }: Props) => {
  const theme = useTheme()
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
