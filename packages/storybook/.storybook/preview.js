import { addDecorator } from '@storybook/react'
import { withPerformance } from 'storybook-addon-performance'

addDecorator(withPerformance)

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  options: {
    isToolshown: true,
    storySort: {
      order: ['Introduction', 'Changelog', 'UI Components'],
    },
  },
}
