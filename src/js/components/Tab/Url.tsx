import React from 'react'
import classNames from 'classnames'
import { useTheme } from 'components/hooks/useTheme'

export default (props) => {
  const {
    tab: { url },
    getHighlightNode,
    duplicated
  } = props
  const isDarkTheme = useTheme()
  return (
    <div
      className={classNames(
        'w-full overflow-hidden truncate text-xs opacity-75 group-hover:opacity-100',
        duplicated && 'text-red-200 group-hover:text-red-400',
        !duplicated && {
          'group-hover:text-black': !isDarkTheme,
          'group-hover:text-white': isDarkTheme
        }
      )}
    >
      {getHighlightNode(url)}
    </div>
  )
}
