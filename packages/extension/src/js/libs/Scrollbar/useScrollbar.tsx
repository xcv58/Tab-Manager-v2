import { createContext, useContext } from 'react'

export const ScrollbarContext = createContext({
  scrollTo: (_) => {},
  scrollbarRef: null,
})

const getTargetValue = (lValue, rValue) => {
  if (lValue < 0) {
    return lValue
  }
  if (rValue < 0) {
    return -rValue
  }
  return 0
}

export default () => {
  const { scrollTo, scrollbarRef } = useContext(ScrollbarContext)

  const scrollToNode = (nodeRef) => {
    const containmentRect = scrollbarRef.current.getBoundingClientRect()
    const { top, bottom, left, right, height, width } =
      nodeRef.current.getBoundingClientRect()
    const topGap = top - 2 * height - containmentRect.top
    const bottomGap = containmentRect.bottom - bottom - 2 * height - 4
    const leftGap = left - 4 - containmentRect.left
    const rightGap = containmentRect.right - right - 32
    scrollTo({
      left:
        width > containmentRect.width
          ? leftGap
          : getTargetValue(leftGap, rightGap),
      top: getTargetValue(topGap, bottomGap),
    })
  }

  return { scrollToNode }
}
