import React, { useEffect, useMemo, StrictMode } from 'react'
import { observer } from 'mobx-react-lite'
import useSystemTheme from 'use-system-theme'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { darkTheme, lightTheme } from 'libs/themes'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { StoreContext, store, useStore } from './hooks/useStore'
import { ThemeContext } from './hooks/useTheme'
import { browser, isProduction } from 'libs'
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
    [isDarkTheme]
  )
  useEffect(() => {
    browser.storage.local.set({ systemTheme })
  }, [systemTheme])
  // The key for DndProvider is a workaround: https://github.com/react-dnd/react-dnd/issues/186#issuecomment-573567724
  return (
    <StrictMode>
      <StoreContext.Provider value={store}>
        <ThemeProvider theme={theme}>
          <DndProvider
            key={isProduction() ? 'dnd-provider' : Date.now()}
            backend={HTML5Backend}
          >
            <ThemeContext.Provider value={isDarkTheme}>
              <ReduceMotionProvider>
                <BrowserRouter>
                  <Main />
                </BrowserRouter>
              </ReduceMotionProvider>
            </ThemeContext.Provider>
          </DndProvider>
        </ThemeProvider>
      </StoreContext.Provider>
    </StrictMode>
  )
})
