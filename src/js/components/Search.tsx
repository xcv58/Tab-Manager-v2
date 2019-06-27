import React, { MutableRefObject } from 'react'
import { observer } from 'mobx-react-lite'
import Input from '@material-ui/core/Input'
import { useStore } from './StoreContext'

export type InputRefProps = { inputRef: MutableRefObject<HTMLInputElement> }
export default observer(({ inputRef }: InputRefProps) => {
  const { userStore, searchStore } = useStore()
  return (
    <Input
      fullWidth
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
