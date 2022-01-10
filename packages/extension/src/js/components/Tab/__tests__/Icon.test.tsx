import React from 'react'
import { shallow } from 'enzyme'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import { Icon } from 'components/Tab/Icon'

const tab = {
  focus: jest.fn(),
  select: jest.fn(),
  iconUrl: 'url',
  isSelected: false,
  bulkSelect: jest.fn(),
}

const props = { tab }

describe('Icon', () => {
  it('should render correct component', () => {
    const el = shallow(<Icon {...props} />)
    expect(el.find(IconButton).length).toBe(1)
    expect(el.find('img').length).toBe(1)
    expect(el.find(Checkbox).length).toBe(1)
  })

  it('should call correct function based on input', () => {
    const el = shallow(<Icon {...props} />)
    el.find(Checkbox).props().onClick({ shiftKey: false })
    expect(tab.select.mock.calls.length).toBe(1)
    expect(tab.bulkSelect.mock.calls.length).toBe(0)
    el.find(Checkbox).props().onClick({ shiftKey: true })
    expect(tab.select.mock.calls.length).toBe(1)
    expect(tab.bulkSelect.mock.calls.length).toBe(1)
    el.find(Checkbox).props().onClick({ shiftKey: true })
    expect(tab.select.mock.calls.length).toBe(1)
    expect(tab.bulkSelect.mock.calls.length).toBe(2)
  })

  it('should always call select if the isSelected is true', () => {
    const select = jest.fn()
    const bulkSelect = jest.fn()
    const el = shallow(
      <Icon tab={{ ...tab, select, bulkSelect, isSelected: true }} />
    )
    el.find(Checkbox).props().onClick({ shiftKey: false })
    expect(select.mock.calls.length).toBe(1)
    expect(bulkSelect.mock.calls.length).toBe(0)
    el.find(Checkbox).props().onClick({ shiftKey: true })
    expect(select.mock.calls.length).toBe(2)
    expect(bulkSelect.mock.calls.length).toBe(0)
    el.find(Checkbox).props().onClick({ shiftKey: true })
    expect(select.mock.calls.length).toBe(3)
    expect(bulkSelect.mock.calls.length).toBe(0)
  })
})
