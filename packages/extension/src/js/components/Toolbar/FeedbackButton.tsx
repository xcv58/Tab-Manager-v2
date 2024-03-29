import React from 'react'
import Button from '@mui/material/Button'
import Feedback from '@mui/icons-material/Feedback'

export default function FeedbackButton() {
  return (
    <Button
      sx={{ textTransform: 'none' }}
      startIcon={<Feedback />}
      variant="text"
      target="_blank"
      rel="noopener noreferrer"
      href="https://github.com/xcv58/Tab-Manager-v2/issues/new/choose"
    >
      Feedback
    </Button>
  )
}
