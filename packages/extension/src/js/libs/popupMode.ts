import { observable, runInAction } from 'mobx'
import { NOT_POPUP } from 'libs'

// Packaged extension pages use their URL. An embedded demo can switch surfaces
// without rebuilding its stores; keep every popup-dependent computed in sync.
const popupModeOverride = observable.box<boolean | undefined>(undefined)

export const isPopupMode = () =>
  popupModeOverride.get() ??
  (typeof window === 'undefined' ||
    !new URLSearchParams(window.location.search).has(NOT_POPUP))

export const setPopupModeOverride = (isPopup: boolean) => {
  runInAction(() => popupModeOverride.set(isPopup))
}
