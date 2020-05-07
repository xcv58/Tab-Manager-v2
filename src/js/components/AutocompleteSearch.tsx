import React, {
  useState,
  useCallback,
  cloneElement,
  createContext,
  forwardRef,
  useContext
} from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from './StoreContext'
import { TextField, Paper } from '@material-ui/core'
import Autocomplete from '@material-ui/lab/Autocomplete'
import { InputRefProps } from './types'
import { VariableSizeList, ListChildComponentProps } from 'react-window'
import ViewOnlyTab from './Tab/ViewOnlyTab'
import { TAB_HEIGHT } from 'libs'

const LISTBOX_PADDING = 8

const renderRow = (props: ListChildComponentProps) => {
  const { data, index, style } = props
  return cloneElement(data[index], {
    style: {
      ...style,
      top: style.top + LISTBOX_PADDING
    }
  })
}

const OuterElementContext = createContext({})

const OuterElementType = forwardRef((props, ref) => {
  const outerProps = useContext(OuterElementContext)
  return <div ref={ref} {...props} {...outerProps} />
})

// Adapter for react-window
const ListboxComponent = forwardRef((props, ref) => {
  const { children, ...other } = props
  const itemData = React.Children.toArray(children)
  const itemCount = itemData.length

  const getHeight = () => Math.min(10, itemCount) * TAB_HEIGHT

  return (
    <div ref={ref}>
      <OuterElementContext.Provider value={other}>
        <VariableSizeList
          itemData={itemData}
          height={getHeight() + 2 * LISTBOX_PADDING}
          width='100%'
          outerElementType={OuterElementType}
          innerElementType='ul'
          itemSize={() => TAB_HEIGHT}
          overscanCount={10}
          itemCount={itemCount}
        >
          {renderRow}
        </VariableSizeList>
      </OuterElementContext.Provider>
    </div>
  )
})

const ARIA_LABLE = 'Search your tab title or URL ... (Press "/" to focus)'

const renderTabOption = (tab) => {
  return <ViewOnlyTab tab={tab} />
}

const Input = (props) => (
  <TextField fullWidth placeholder={ARIA_LABLE} variant='standard' {...props} />
)

const AutocompleteSearch = observer(
  (props: InputRefProps & { forceUpdate: Function; initRender: boolean }) => {
    const { inputRef, initRender, forceUpdate } = props
    const { userStore, searchStore, windowStore } = useStore()
    const { search, query, startType, stopType } = searchStore
    return (
      <Autocomplete
        fullWidth
        blurOnSelect
        freeSolo
        selectOnFocus
        openOnFocus
        autoHighlight
        ref={inputRef}
        inputValue={query}
        disableListWrap
        PaperComponent={(props) => (
          <Paper elevation={24}>{props.children}</Paper>
        )}
        onFocus={() => {
          startType()
          search(query)
        }}
        onBlur={() => stopType()}
        onInputChange={(_, value, reason) => {
          if (reason !== 'reset') {
            search(value)
          }
        }}
        onChange={(_, tab) => {
          tab.activate()
          forceUpdate()
        }}
        renderInput={(props) => (
          <Input
            {...props}
            autoFocus={initRender && userStore.autoFocusSearch}
          />
        )}
        getOptionLabel={(option) => option.title + option.url}
        options={windowStore.tabs}
        renderOption={renderTabOption}
        ListboxComponent={ListboxComponent}
      />
    )
  }
)

export default observer((props: InputRefProps) => {
  const [initRender, setInitRender] = useState(true)
  const [fake, setFake] = useState(false)
  const { query } = useStore().searchStore
  const forceUpdate = useCallback(() => {
    setInitRender(false)
    setFake(true)
    setTimeout(() => setFake(false), 0)
  }, [])
  if (fake) {
    return <Input value={query} />
  }
  return <AutocompleteSearch {...props} {...{ initRender, forceUpdate }} />
})
