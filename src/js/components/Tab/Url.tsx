import React from 'react'
import Typography from '@material-ui/core/Typography'

export default class Url extends React.Component {
  render () {
    const {
      tab: { url },
      className,
      getHighlightNode
    } = this.props
    return (
      <Typography className={className}>{getHighlightNode(url)}</Typography>
    )
  }
}
