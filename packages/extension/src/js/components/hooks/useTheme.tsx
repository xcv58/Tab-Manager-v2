import { createContext, useContext } from 'react'

export const ThemeContext = createContext(false)

export const useTheme = () => useContext(ThemeContext)

export const useTextClasses = () => {
  const isDarkTheme = useTheme()
  return isDarkTheme ? 'bg-charcoal text-white' : 'bg-white text-black'
}
