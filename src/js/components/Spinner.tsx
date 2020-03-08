import React from 'react'
import classNames from 'classnames'
import { useTheme } from './ThemeContext'

export default () => {
  const isDarkTheme = useTheme()
  return (
    <div className='flex justify-center items-center w-full h-24'>
      <div
        className={classNames('la-ball-spin ', {
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
