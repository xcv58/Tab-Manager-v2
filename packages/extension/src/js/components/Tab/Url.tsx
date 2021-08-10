import React from 'react'
import classNames from 'classnames'
import { useTheme } from 'components/hooks/useTheme'

export interface UrlProps {
  tab: {
    /**
     * The tab's URL.
     */
    url: string
  }
  /**
   * Whether the tab is duplicated.
   */
  duplicated?: boolean
  /**
   * Get the highlight node based on the query.
   */
  getHighlightNode: (url: string) => React.ReactNode
}

export default (props: UrlProps) => {
  const {
    tab: { url },
    getHighlightNode,
    duplicated,
  } = props
  const isDarkTheme = useTheme()
  return (
    <div
      className={classNames(
        'w-full overflow-hidden truncate text-xs opacity-75 group-hover:opacity-100',
        duplicated && 'text-red-200 group-hover:text-red-400',
        !duplicated && {
          'group-hover:text-black': !isDarkTheme,
          'group-hover:text-white': isDarkTheme,
        }
      )}
    >
      {getHighlightNode(url)}
    </div>
  )
}
