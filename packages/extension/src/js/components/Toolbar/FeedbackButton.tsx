import React from 'react'
import { FeedbackIcon } from 'icons/materialIcons'

export default function FeedbackButton() {
  return (
    <a
      className="inline-flex items-center gap-1.5 px-2 py-1 text-sm hover:underline"
      href="https://github.com/xcv58/Tab-Manager-v2/issues/new/choose"
      target="_blank"
      rel="noopener noreferrer"
    >
      <FeedbackIcon fontSize={18} />
      Feedback
    </a>
  )
}
