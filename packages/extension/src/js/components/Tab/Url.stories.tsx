import React from 'react'
import { Story, Meta } from '@storybook/react/types-6-0'

import Url, { UrlProps } from './Url'

const meta: Meta<typeof Url> = {
  title: 'UI Components/Url',
  component: Url,
  argTypes: {
    tab: {
      url: {
        control: 'string',
      },
    },
    duplicated: { control: 'boolean' },
  },
}

export default meta

const getHighlightNode = (url: string) => url

const Template: Story<UrlProps> = (args) => (
  <Url {...{ getHighlightNode }} {...args} />
)

export const Normal = Template.bind({})
Normal.args = {
  tab: {
    url: 'https://github.com/xcv58/Tab-Manager-v2',
  },
}

export const Highlight = Template.bind({})
Highlight.args = {
  getHighlightNode: (x: string) => {
    return (
      <div>
        {x.substring(0, 8)}
        <span style={{ color: 'red' }}>{x.substring(8, 18)}</span>
        {x.substring(18)}
      </div>
    )
  },
  tab: {
    url: 'https://github.com/xcv58/Tab-Manager-v2',
  },
}

export const Duplicated = Template.bind({})
Duplicated.args = {
  tab: {
    url: 'https://github.com/xcv58/Tab-Manager-v2',
  },
  duplicated: true,
}
