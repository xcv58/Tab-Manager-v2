import React from 'react'
import Typography from '@material-ui/core/Typography'

export default props => {
  const {
    tab: { url },
    className,
    getHighlightNode
  } = props
  return <Typography className={className}>{getHighlightNode(url)}</Typography>
}
