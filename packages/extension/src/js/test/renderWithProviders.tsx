import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeContext } from 'components/hooks/useTheme'
import { StoreContext } from 'components/hooks/useStore'
import {
  AppThemeContext,
  AppTheme,
  lightAppTheme,
  darkAppTheme,
} from 'libs/appTheme'

type ProviderOptions = {
  /** Pass `true` for dark theme, `false` (default) for light. */
  isDarkTheme?: boolean
  /** Partial store mock – merged onto a minimal default. */
  store?: any
}

/**
 * Render helper that wraps the component under test with the same providers
 * the real app uses, but without any MUI dependency.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    isDarkTheme = false,
    store,
    ...renderOptions
  }: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  const appTheme: AppTheme = isDarkTheme ? darkAppTheme : lightAppTheme

  function Wrapper({ children }: { children: React.ReactNode }) {
    const tree = (
      <AppThemeContext.Provider value={appTheme}>
        <ThemeContext.Provider value={isDarkTheme}>
          {children}
        </ThemeContext.Provider>
      </AppThemeContext.Provider>
    )
    if (store) {
      return <StoreContext.Provider value={store}>{tree}</StoreContext.Provider>
    }
    return tree
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}
