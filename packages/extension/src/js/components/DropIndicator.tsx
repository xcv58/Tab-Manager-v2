import React from 'react'
import classNames from 'classnames'

type Props = {
  position?: 'before' | 'after'
}

export default ({ position = 'before' }: Props) => (
  <hr
    className={classNames('relative z-10 border-red-700', {
      'border-t-0 border-b-2': position === 'before',
      'border-b-0 border-t-2': position === 'after',
    })}
    style={{
      marginTop: position === 'before' ? -2 : 0,
      marginBottom: position === 'after' ? -2 : 0,
    }}
  />
)
