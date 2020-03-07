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
      className={classNames({
        'text-red-200': duplicated,
        'text-gray-400': !duplicated,
        'group-hover:text-red-400': duplicated,
        'group-hover:text-black': !duplicated
      })}
    >
      {getHighlightNode(url)}
    </div>
  )
}
