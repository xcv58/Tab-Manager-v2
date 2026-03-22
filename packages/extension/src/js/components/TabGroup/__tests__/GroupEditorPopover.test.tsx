import React from 'react'
import { render, screen } from '@testing-library/react'
import { AppThemeContext, darkAppTheme } from 'libs/appTheme'
import { darkTheme } from 'libs/themes'
import GroupEditorPopover from '../GroupEditorPopover'

describe('GroupEditorPopover', () => {
  it('renders the title input with dark theme colors', async () => {
    const anchorEl = document.createElement('button')
    anchorEl.getBoundingClientRect = () =>
      ({
        x: 24,
        y: 48,
        top: 48,
        left: 24,
        bottom: 88,
        right: 144,
        width: 120,
        height: 40,
        toJSON: () => ({}),
      }) as DOMRect
    document.body.appendChild(anchorEl)

    const { unmount } = render(
      <AppThemeContext.Provider value={darkAppTheme}>
        <GroupEditorPopover
          anchorEl={anchorEl}
          groupId={7}
          initialColor="blue"
          initialTitle="Dark mode"
          open
          onClose={() => {}}
          onRecolor={() => {}}
          onRename={() => {}}
        />
      </AppThemeContext.Provider>,
    )

    const input = await screen.findByTestId('tab-group-editor-title-7')
    expect(input).toHaveStyle(`
      background-color: transparent;
      border-color: ${darkTheme.palette.primary.main};
      caret-color: ${darkTheme.palette.text.primary};
      color: ${darkTheme.palette.text.primary};
      color-scheme: dark;
    `)

    unmount()
    anchorEl.remove()
  })
})
