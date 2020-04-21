import { MutableRefObject } from 'react'
import Tab from 'stores/Tab'
import Window from 'stores/Window'

export type TabProps = { tab: Tab }
export type WinProps = { win: Window }

export type InputRefProps = { inputRef: MutableRefObject<HTMLInputElement> }
