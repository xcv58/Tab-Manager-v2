import React from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from './StoreContext'
import { Input, InputAdornment } from '@material-ui/core'
import CloseButton from './CloseButton'
import { InputRefProps } from './types'

const ARIA_LABLE = 'Search your tab title... (Press "/" to focus)'

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
      inputProps={{
        ref: inputRef,
        'aria-label': ARIA_LABLE
      }}
      placeholder={ARIA_LABLE}
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
