import { createContext, useContext } from 'react'

export const ThemeContext = createContext(false)

export const useTheme = () => useContext(ThemeContext)
