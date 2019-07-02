import { findLastVisibleOrLastTab, findFirstVisibleOrFirstTab } from './index'

export const ItemTypes = {
  TAB: 'tab'
}

export const getTargetTab = (tabs, begin) => {
  if (begin) {
    return findFirstVisibleOrFirstTab(tabs)
  }
  return findLastVisibleOrLastTab(tabs)
}
