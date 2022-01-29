import React from 'react'
import Button from '@mui/material/Button'
import FavoriteBorder from '@mui/icons-material/FavoriteBorder'

export default function SponsorButton() {
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
