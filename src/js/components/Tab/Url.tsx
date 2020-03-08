import React from 'react'
import classNames from 'classnames'
import { useTheme } from 'components/ThemeContext'

export default props => {
  const {
    tab: { url },
    getHighlightNode,
    duplicated
  } = props
  const isDarkTheme = useTheme()
  return (
    <div
      className={classNames(
        'w-full overflow-hidden truncate text-xs',
        duplicated && 'text-red-200 group-hover:text-red-400',
        !duplicated && {
          'text-gray-500 group-hover:text-black': !isDarkTheme,
          'text-gray-600 group-hover:text-white': isDarkTheme
        }
      )}
    >
      {getHighlightNode(url)}
    </div>
  )
}
