import React, { Suspense, useEffect, useState } from 'react'

// Load optional dialogs when first requested, then retain their state and exit
// transitions. Closing a dialog while its chunk loads still leaves it closed.
export default function DeferredContent({
  open,
  children,
}: React.PropsWithChildren<{ open: boolean }>) {
  const [requested, setRequested] = useState(open)
  useEffect(() => {
    if (open) setRequested(true)
  }, [open])
  if (!open && !requested) return null
  return <Suspense fallback={null}>{children}</Suspense>
}
