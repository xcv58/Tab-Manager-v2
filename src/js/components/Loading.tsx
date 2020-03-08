import React from 'react'
import classNames from 'classnames'
import { useTheme } from './ThemeContext'

export default () => {
  const isDarkTheme = useTheme()
  return (
    <div id='spinner'>
      <div
        className={classNames('la-ball-spin la-3x', {
          'la-dark': !isDarkTheme
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
