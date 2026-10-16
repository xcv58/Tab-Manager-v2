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
  fallback?: () => HTMLElement | null,
): void => {
  if ((!focusTarget && !fallback) || typeof window === 'undefined') {
    return
  }

  window.requestAnimationFrame(() => {
    let target = typeof focusTarget === 'function' ? focusTarget() : focusTarget
    const isAvailable = (element: HTMLElement | null): element is HTMLElement =>
      !!(
        element?.isConnected &&
        !element.hasAttribute('disabled') &&
        !element.closest('[hidden], [aria-hidden="true"], [inert]')
      )
    if (!isAvailable(target)) target = fallback?.() || null
    if (!isAvailable(target)) return
    target.focus({ preventScroll: true })
  })
}
