import React from 'react'
import Loading from 'components/Loading'
import { render } from '@testing-library/react'
import { ThemeContext } from 'components/hooks/useTheme'

describe('Loading should', () => {
  it('render divs with default props', () => {
    const el = render(<Loading />)
    expect(el).toMatchSnapshot()
  })

  it('render small component', () => {
    const el = render(<Loading small />)
    expect(el).toMatchSnapshot()
  })

  it('render divs in dark mode', () => {
    const el = render(
      <ThemeContext.Provider value>
        <Loading />
      </ThemeContext.Provider>
    )
    expect(el).toMatchSnapshot()
  })
})
