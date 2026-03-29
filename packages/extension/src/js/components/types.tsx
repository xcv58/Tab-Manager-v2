import Tab from 'stores/Tab'
import Window from 'stores/Window'

export type TabProps = {
  tab: Tab
  faked?: boolean
  disableSequentialFocus?: boolean
}
export type WinProps = { win: Window }
