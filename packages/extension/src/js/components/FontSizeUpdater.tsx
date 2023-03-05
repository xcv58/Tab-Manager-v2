import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useFontSize } from 'components/hooks/useStore'

export default observer(() => {
  const fontSize = useFontSize()
  useEffect(() => {
    document.getElementsByTagName('html')[0].style.fontSize = `${fontSize}px`
  }, [fontSize])
  return <></>
})
