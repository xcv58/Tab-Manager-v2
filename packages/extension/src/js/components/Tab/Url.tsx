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
   * Whether the tab should use the classic duplicate cue.
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
  const uiColors = getUiColorTokens(
    isDarkTheme,
    duplicated ? 'classic' : 'modern',
  )
  return (
    <div
      className={classNames(
        'w-full overflow-hidden truncate text-xs opacity-75 transition-colors group-hover:opacity-100',
        {
          'group-hover:text-red-400': duplicated,
          'group-hover:text-gray-900': !isDarkTheme && !duplicated,
          'group-hover:text-gray-100': isDarkTheme && !duplicated,
        },
      )}
      style={{
        color: duplicated ? uiColors.duplicateUrl : uiColors.mutedText,
      }}
    >
      {getHighlightNode(url)}
    </div>
  )
}
