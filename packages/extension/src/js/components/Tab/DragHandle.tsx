import React from 'react'
import classNames from 'classnames'
import { useTheme } from 'components/hooks/useTheme'

export default () => {
  if (IS_SAFARI) {
    return null
  }
  const isDarkTheme = useTheme()
  return (
    <button
      className={classNames(
        'inline-flex items-center justify-center w-8 h-8 m-2 rounded-full hover:shadow-xs focus:outline-none focus:ring cursor-move',
        {
          'hover:bg-blue-200 active:bg-blue-300': !isDarkTheme,
          'hover:bg-gray-600 active:bg-gray-800': isDarkTheme,
        },
      )}
    >
      &#9776;
    </button>
  )
}
