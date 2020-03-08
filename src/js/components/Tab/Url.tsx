import React from 'react'
import classNames from 'classnames'

export default props => {
  const {
    tab: { url },
    getHighlightNode,
    duplicated
  } = props
  return (
    <div
      className={classNames('w-full overflow-hidden truncate', {
        'text-red-200': duplicated,
        'text-gray-500': !duplicated,
        'group-hover:text-red-400': duplicated,
        'group-hover:text-black': !duplicated
      })}
    >
      {getHighlightNode(url)}
    </div>
  )
}
