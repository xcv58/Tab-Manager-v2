import React from 'react'
import { useStore } from 'components/hooks/useStore'

const ContainerIndicator = (props) => {
  const { cookieStoreId } = props
  const { containerStore } = useStore()
  const container = containerStore.getContainer(cookieStoreId)
  if (!container) {
    return null
  }
  const { colorCode } = container
  return (
    <hr
      className='absolute border'
      style={{
        width: 'calc(100% - 24px)',
        left: 12,
        bottom: 2,
        borderColor: colorCode
      }}
    />
  )
}

export default ContainerIndicator
