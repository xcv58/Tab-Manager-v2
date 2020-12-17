import React, { StrictMode } from 'react'
import { observer } from 'mobx-react-lite'
import useSystemTheme from 'use-system-theme'
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles'
import { darkTheme, lightTheme } from 'libs/themes'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { StoreContext, store, useStore } from './hooks/useStore'
import { ThemeContext } from './hooks/useTheme'
import { isProduction } from 'libs'
import { BrowserRouter } from 'react-router-dom'
import Main from './Main'
import { ReduceMotionProvider } from 'libs/useReduceMotion'

export default observer(() => {
  const { userStore } = useStore()
  const systemTheme = useSystemTheme()
  const isDarkTheme =
    (userStore.useSystemTheme && systemTheme === 'dark') ||
    (!userStore.useSystemTheme && userStore.darkTheme)
  const theme = isDarkTheme ? darkTheme : lightTheme
  // The key for DndProvider is a workaround: https://github.com/react-dnd/react-dnd/issues/186#issuecomment-573567724
  return (
    <StrictMode>
      <StoreContext.Provider value={store}>
        <MuiThemeProvider theme={createMuiTheme(theme)}>
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
        </MuiThemeProvider>
      </StoreContext.Provider>
    </StrictMode>
  )
})
