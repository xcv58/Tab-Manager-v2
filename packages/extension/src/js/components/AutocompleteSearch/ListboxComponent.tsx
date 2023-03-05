import React, {
  cloneElement,
  createContext,
  forwardRef,
  useContext,
} from 'react'
import { VariableSizeList, ListChildComponentProps } from 'react-window'
import { useTabHeight } from 'components/hooks/useStore'

const LISTBOX_PADDING = 8

const renderRow = (props: ListChildComponentProps) => {
  const { data, index, style } = props
  return cloneElement(data[index], {
    style: {
      ...style,
      top: style.top + LISTBOX_PADDING,
    },
  })
}

const OuterElementContext = createContext({})

const OuterElementType = forwardRef<HTMLDivElement>((props, ref) => {
  const outerProps = useContext(OuterElementContext)
  return <div ref={ref} {...props} {...outerProps} />
})

const ListboxComponent = forwardRef<HTMLDivElement>((props, ref) => {
  const tabHeight = useTabHeight()
  const { children, ...other } = props
  const itemData = React.Children.toArray(children)
  const itemCount = itemData.length

  const getHeight = () => Math.min(20, itemCount) * tabHeight

  return (
    <div ref={ref}>
      <OuterElementContext.Provider value={other}>
        <VariableSizeList
          itemData={itemData}
          height={getHeight() + 2 * LISTBOX_PADDING}
          width="100%"
          outerElementType={OuterElementType}
          innerElementType="ul"
          itemSize={() => tabHeight}
          overscanCount={5}
          itemCount={itemCount}
        >
          {renderRow}
        </VariableSizeList>
      </OuterElementContext.Provider>
    </div>
  )
})

export default ListboxComponent
