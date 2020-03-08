import React from 'react'
import classNames from 'classnames'
import { useTheme } from './ThemeContext'

export default ({ small = false }) => {
  const isDarkTheme = useTheme()
  const containerProps = small
    ? { className: 'flex items-center justify-center w-full h-24' }
    : { id: 'spinner' }
  return (
    <div {...containerProps}>
      <div
        className={classNames('la-ball-spin', {
          'la-dark': !isDarkTheme,
          'la-3x': !small
        })}
      >
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
      </div>
    </div>
  )
}
