export const captureDialogFocusTarget = (): HTMLElement | null => {
  if (typeof document === 'undefined') {
    return null
  }

  const { activeElement, body } = document
  if (!(activeElement instanceof HTMLElement) || activeElement === body) {
    return null
  }

  activeElement.blur()
  return activeElement
}

export const restoreDialogFocusTarget = (
  focusTarget: HTMLElement | null | (() => HTMLElement | null),
): void => {
  if (!focusTarget || typeof window === 'undefined') {
    return
  }

  window.requestAnimationFrame(() => {
    const target =
      typeof focusTarget === 'function' ? focusTarget() : focusTarget
    if (!target?.isConnected || target.hasAttribute('disabled')) {
      return
    }
    target.focus({ preventScroll: true })
  })
}
