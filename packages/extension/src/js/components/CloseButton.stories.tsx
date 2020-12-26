import React from 'react'
import { Story, Meta } from '@storybook/react'

import CloseButton, { CloseButtonProps } from './CloseButton'

export default {
  title: 'UI Components/CloseButton',
  component: CloseButton,
  argTypes: { disabled: { control: 'boolean' } }
} as Meta

const Template: Story<CloseButtonProps> = (args) => <CloseButton {...args} />

export const Enabled = Template.bind({})
Enabled.args = {
  disabled: false
}

export const Disabled = Template.bind({})
Disabled.args = {
  disabled: true
}
