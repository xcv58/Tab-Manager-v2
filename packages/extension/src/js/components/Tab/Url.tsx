import React from 'react'
import classNames from 'classnames'
import { useTheme } from 'components/hooks/useTheme'
import { getUiColorTokens } from 'libs/uiColorTokens'

export interface UrlProps {
  tab: {
    /**
     * The tab's URL.
     */
    url: string
  }
  /**
   * Get the highlight node based on the query.
   */
  getHighlightNode: (url: string) => React.ReactNode
}

export default (props: UrlProps) => {
  const {
    tab: { url },
    getHighlightNode,
  } = props
  const isDarkTheme = useTheme()
  const uiColors = getUiColorTokens(isDarkTheme)
  return (
    <div
      className={classNames(
        'w-full overflow-hidden truncate text-xs opacity-75 transition-colors group-hover:opacity-100',
        {
          'group-hover:text-gray-900': !isDarkTheme,
          'group-hover:text-gray-100': isDarkTheme,
        },
      )}
      style={{
        color: uiColors.mutedText,
      }}
    >
      {getHighlightNode(url)}
    </div>
  )
}
