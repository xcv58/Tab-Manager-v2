import React, { MutableRefObject } from 'react'
import { observer } from 'mobx-react'
import { useStore } from './StoreContext'
import { Input, InputAdornment } from '@material-ui/core'
import CloseButton from './CloseButton'

export type InputRefProps = { inputRef: MutableRefObject<HTMLInputElement> }

export default observer(({ inputRef }: InputRefProps) => {
  const { userStore, searchStore } = useStore()
  const { search, query, startType, stopType, clear } = searchStore
  const endAdornment = query && (
    <InputAdornment position='end'>
      <CloseButton
        onClick={() => {
          inputRef.current.focus()
          clear()
        }}
      />
    </InputAdornment>
  )
  return (
    <Input
      fullWidth
      autoFocus={userStore.autoFocusSearch}
      inputProps={{ ref: inputRef }}
      placeholder='Search your tab title... (Press "/" to focus)'
      onChange={(e) => search(e.target.value)}
      onFocus={() => {
        search(query)
        startType()
      }}
      onBlur={() => stopType()}
      value={query}
      endAdornment={endAdornment}
    />
  )
})
