import { describe, it, expect } from 'test'
import { ItemTypes } from 'libs'

describe('ItemTypes', () => {
  it('has tab type', () => {
    expect(ItemTypes.TAB).toBeTruthy()
  })
})
