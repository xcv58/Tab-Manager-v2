import React from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'

let Dump: any = () => null

if (process.env.TARGET_BROWSER === 'firefox') {
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
  Dump = observer(ContainerIndicator)
}

export default Dump
