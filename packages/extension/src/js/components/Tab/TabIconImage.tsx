import React from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import { websiteIcons } from 'libs/websiteIcons'
import emptyIcon from 'img/chrome/empty.png'
import type { TabProps } from 'components/types'

const WebsiteTabIconImage = observer(function WebsiteTabIconImage({
  tab,
  faked,
}: Pick<TabProps, 'tab' | 'faked'>) {
  const { userStore } = useStore()
  const { id, url, iconUrl } = tab
  const enabled = userStore.showTabIcon
  const ref = React.useRef<HTMLImageElement>(null)
  const [visible, setVisible] = React.useState(false)
  const [revision, setRevision] = React.useState(0)
  const [resolved, setResolved] = React.useState<{
    key: string
    image: string
  } | null>(null)
  const [failed, setFailed] = React.useState('')
  const key = `${id}:${url}:${revision}`
  React.useEffect(() => {
    if (!websiteIcons || faked || !ref.current) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [faked])
  React.useEffect(
    () =>
      websiteIcons?.subscribe((tabId) => {
        if (tabId != null && tabId !== id) return
        setResolved(null)
        setRevision((value) => value + 1)
      }),
    [id],
  )
  React.useEffect(() => {
    if (!websiteIcons || !enabled || !visible || faked) return
    let current = true
    void websiteIcons
      .resolve(id, url)
      .then((image) => {
        if (current && image) setResolved({ key, image })
      })
      .catch(() => {})
    return () => {
      current = false
    }
  }, [id, url, key, enabled, visible, faked])
  const candidate =
    enabled && websiteIcons
      ? faked
        ? iconUrl
        : resolved?.key === key
          ? resolved.image
          : emptyIcon
      : emptyIcon
  return (
    <img
      ref={ref}
      alt=""
      className="w-6 h-6"
      style={{ width: 20, height: 20 }}
      src={failed === candidate ? emptyIcon : candidate}
      onError={() => setFailed(candidate)}
    />
  )
})

// Keep browser-supplied icons on the original lightweight path in Chrome,
// Firefox and the normal website demo: no visibility observers, queues or icon requests.
export default observer(function TabIconImage(
  props: Pick<TabProps, 'tab' | 'faked'>,
) {
  return websiteIcons ? (
    <WebsiteTabIconImage {...props} />
  ) : (
    <img
      alt=""
      className="w-6 h-6"
      style={{ width: 20, height: 20 }}
      src={props.tab.iconUrl}
    />
  )
})
