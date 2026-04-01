import React from 'react'
import { FavoriteBorderIcon } from 'icons/materialIcons'

export default function SponsorButton() {
  return (
    <a
      className="inline-flex items-center gap-1.5 px-2 py-1 text-sm hover:underline"
      href="https://github.com/sponsors/xcv58"
      target="_blank"
      rel="noopener noreferrer"
    >
      <FavoriteBorderIcon className="text-red-500" fontSize={18} />
      Sponsor
    </a>
  )
}
