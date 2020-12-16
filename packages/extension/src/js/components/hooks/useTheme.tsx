import { createContext, useContext } from 'react'
import classNames from 'classnames'

export const ThemeContext = createContext(false)

export const useTheme = () => useContext(ThemeContext)

export const useThemeClassNames = () => {
  const isDarkTheme = useTheme()
  return classNames(
    'flex flex-col h-screen overflow-hidden',
    isDarkTheme ? 'bg-charcoal text-white' : 'bg-white text-black'
  )
}
