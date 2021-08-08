import React, { useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { HistoryItem } from 'stores/SearchStore'
import { match } from 'fuzzy'
import classNames from 'classnames'
import Url from 'components/Tab/Url'
import { useStore } from 'components/hooks/useStore'
// import Tooltip from '@material-ui/core/Tooltip'

const pre = "<span class='text-red-500'>"
const post = '</span>'

const X = observer((props) => {
  const { searchStore } = useStore()
  const { query } = searchStore
  const { title } = props.tab
  const getHighlightNode = useCallback(
    (text) => {
      if (!query) {
        return text
      }
      const result = match(query, text, { pre, post })
      if (!result) {
        return <div>{text}</div>
      }
      return <div dangerouslySetInnerHTML={{ __html: result.rendered }} />
    },
    [query]
  )
  const buttonClassName = classNames(
    'group flex flex-col justify-center flex-1 h-12 overflow-hidden text-left m-0 rounded-sm text-base'
  )
  return (
    <button className={buttonClassName} disabled>
      <div className="w-full overflow-hidden truncate">
        {getHighlightNode(title)}
      </div>
      <Url {...props} {...{ getHighlightNode }} />
    </button>
  )
})

export default observer(function HistoryItemTab(props: { tab: HistoryItem }) {
  const { tab } = props
  const { lastVisitTime, typedCount, visitCount } = props.tab

  return (
    <div tabIndex={-1} className="relative flex items-center w-full">
      <span>Histroy:</span>
      lastVisitTime: {lastVisitTime}
      typedCount: {typedCount}
      visitCount: {visitCount}
      {/* {title}
      {url} */}
      <X tab={tab} />
      {/* <TabContent tab={tab} faked /> */}
    </div>
  )
})
