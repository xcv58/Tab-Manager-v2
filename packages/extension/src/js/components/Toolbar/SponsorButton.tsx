import React from 'react'
import Button from '@material-ui/core/Button'
import FavoriteBorder from '@material-ui/icons/FavoriteBorder'

export default () => {
  return (
    <Button
      startIcon={<FavoriteBorder className="text-red-500 capitalize" />}
      variant="outlined"
      target="_blank"
      rel="noopener noreferrer"
      href="https://github.com/sponsors/xcv58"
    >
      Sponsor
    </Button>
  )
}
