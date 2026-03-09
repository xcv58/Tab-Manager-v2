import React from 'react'
import classNames from 'classnames'
import { MIN_INTERACTIVE_ROW_HEIGHT } from 'libs/layoutMetrics'

type Props = {
  children: React.ReactNode
  className?: string
  tail?: React.ReactNode
}

const DefaultTail = () => (
  <div aria-hidden="true" className="h-10 shrink-0" style={{ width: 4 }} />
)

export default ({ children, className, tail }: Props) => (
  <div
    className={classNames(
      'flex h-10 shrink-0 items-center gap-0.5 pr-1',
      className,
    )}
    style={{ minHeight: MIN_INTERACTIVE_ROW_HEIGHT }}
  >
    {children}
    {tail ?? <DefaultTail />}
  </div>
)
