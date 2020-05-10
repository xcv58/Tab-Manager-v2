import { MutableRefObject } from 'react'

/**
 * This is a hack way to prevent other library to change focus state for the node.
 * We must remove this after the upstream fixed.
 *
 * @param nodeRef the React ref for focusable element
 */
export const _preventFocus = (nodeRef: MutableRefObject<any>) => {
  if (!nodeRef || !nodeRef.current) {
    return
  }
  const { _focus, focus } = nodeRef.current
  if (_focus) {
    return
  }
  nodeRef.current._focus = focus
  nodeRef.current.focus = (options = { setFocus: false }) => {
    const { setFocus } = options
    if (setFocus) {
      nodeRef.current._focus(options, setFocus)
    }
  }
}
