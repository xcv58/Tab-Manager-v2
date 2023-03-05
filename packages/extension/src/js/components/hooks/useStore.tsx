import React from 'react'
import Store from 'stores'

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
  return 3 * fontSize
}
