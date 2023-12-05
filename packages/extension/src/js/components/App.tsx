import React, { useEffect, useMemo, StrictMode } from 'react'
import { observer } from 'mobx-react-lite'
import useSystemTheme from 'use-system-theme'
import { ThemeProvider as MaterialTailwindThemeProvider } from '@material-tailwind/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { darkTheme, lightTheme } from 'libs/themes'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { StoreContext, store, useStore } from './hooks/useStore'
import { ThemeContext } from './hooks/useTheme'
import { browser } from 'libs'
import { BrowserRouter } from 'react-router-dom'
import Main from './Main'
import { ReduceMotionProvider } from 'libs/useReduceMotion'

export default observer(() => {
  const { userStore } = useStore()
  const systemTheme = useSystemTheme()
  const isDarkTheme =
    (userStore.useSystemTheme && systemTheme === 'dark') ||
    (!userStore.useSystemTheme && userStore.darkTheme)
  const theme = useMemo(
    () => createTheme(isDarkTheme ? darkTheme : lightTheme),
    [isDarkTheme],
  )
  useEffect(() => {
    const { availHeight, availLeft, availTop, availWidth } = screen
    browser.storage.local.set({
      systemTheme,
      availHeight,
      availLeft,
      availTop,
      availWidth,
    })
  }, [systemTheme])
  return (
    <StrictMode>
      <StoreContext.Provider value={store}>
        <ThemeProvider theme={theme}>
          <MaterialTailwindThemeProvider>
            {/* The context for DndProvider is a workaround: https://github.com/react-dnd/react-dnd/issues/3257#issuecomment-1239254032 */}
            <DndProvider context={window} backend={HTML5Backend}>
              <ThemeContext.Provider value={isDarkTheme}>
                <ReduceMotionProvider>
                  <BrowserRouter>
                    <Main />
                  </BrowserRouter>
                </ReduceMotionProvider>
              </ThemeContext.Provider>
            </DndProvider>
          </MaterialTailwindThemeProvider>
        </ThemeProvider>
      </StoreContext.Provider>
    </StrictMode>
  )
})
