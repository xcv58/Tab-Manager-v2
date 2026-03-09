import React from 'react'
import Store from 'stores'
import { getWindowRowHeight } from 'libs/layoutMetrics'

export const store = new Store()

export const StoreContext = React.createContext<Store>(store)

export const useStore = () => {
  return React.useContext(StoreContext)
}

export const useFontSize = () => {
  const { userStore } = useStore()
  return userStore.fontSize
}

export const useTabHeight = () => {
  const fontSize = useFontSize()
  return getWindowRowHeight(fontSize)
}
