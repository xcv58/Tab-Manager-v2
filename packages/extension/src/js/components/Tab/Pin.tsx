import React from 'react'

// Preserve the released pin's size and rotation. Anchor it to the row's
// center explicitly so search-result layout cannot push it above the row.
const PIN = (
  <span
    role="img"
    aria-label="Pinned tab"
    className="absolute left-0 top-1/2 z-10 w-0 h-0 text-xs origin-bottom-right transform -rotate-90 pointer-events-none"
  >
    📌
  </span>
)

export default PIN
