import React, { MutableRefObject } from 'react'
import { observer } from 'mobx-react'
import { useStore } from './StoreContext'
import { TextField } from '@material-ui/core'

export type InputRefProps = { inputRef: MutableRefObject<HTMLInputElement> }

export default observer(({ inputRef }: InputRefProps) => {
  const { userStore, searchStore } = useStore()
  return (
    <TextField
      fullWidth
      type='search'
      autoFocus={userStore.autoFocusSearch}
      inputProps={{ ref: inputRef }}
      placeholder='Search your tab title...'
      onChange={e => searchStore.search(e.target.value)}
      onFocus={() => {
        const { search, query, startType } = searchStore
        search(query)
        startType()
      }}
      onBlur={() => searchStore.stopType()}
      value={searchStore.query}
    />
  )
})
