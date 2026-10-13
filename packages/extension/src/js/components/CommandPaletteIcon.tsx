import React from 'react'
import type { BaseSvgIconProps } from 'icons/BaseSvgIcon'
import {
  BrowserWindowIcon,
  CopyTextIcon,
  DeselectTabsIcon,
  ExportTabsIcon,
  KeyboardShortcutsIcon,
  MoveTabsIcon,
  PinTabIcon,
  SelectTabsIcon,
  TabGroupIcon,
  UngroupTabIcon,
} from 'icons/actionIcons'
import {
  ChevronRightIcon,
  CloseIcon,
  DarkModeRoundedIcon,
  DeleteSweepIcon,
  ExpandMoreIcon,
  FilterListIcon,
  LightModeRoundedIcon,
  OpenInNewIcon,
  RefreshIcon,
  SettingsSharpIcon,
  SortIcon,
  SyncIcon,
} from 'icons/materialIcons'
import { useAppTheme } from 'libs/appTheme'
import { getChromeTabGroupColor } from 'libs/chromeTabGroupColors'
import type { PaletteIconName } from 'stores/ActionStore'

const icons: Record<PaletteIconName, React.ComponentType<BaseSvgIconProps>> = {
  reload: RefreshIcon,
  copy: CopyTextIcon,
  export: ExportTabsIcon,
  move: MoveTabsIcon,
  'new-window': OpenInNewIcon,
  window: BrowserWindowIcon,
  group: TabGroupIcon,
  pin: PinTabIcon,
  close: CloseIcon,
  ungroup: UngroupTabIcon,
  expand: ChevronRightIcon,
  collapse: ExpandMoreIcon,
  sort: SortIcon,
  select: SelectTabsIcon,
  deselect: DeselectTabsIcon,
  'clean-duplicates': DeleteSweepIcon,
  cluster: FilterListIcon,
  sync: SyncIcon,
  settings: SettingsSharpIcon,
  keyboard: KeyboardShortcutsIcon,
  theme: DarkModeRoundedIcon,
}

export default function CommandPaletteIcon({
  name,
  danger,
  groupColor,
}: {
  name: PaletteIconName
  danger?: boolean
  groupColor?: string
}) {
  const theme = useAppTheme()
  const Icon =
    name === 'theme' && theme.mode === 'dark'
      ? LightModeRoundedIcon
      : icons[name]

  return (
    <span
      aria-hidden="true"
      data-palette-icon={name}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 20px',
        width: 20,
        height: 16,
        color: groupColor
          ? getChromeTabGroupColor(groupColor).line
          : danger
            ? undefined
            : theme.palette.text.secondary,
        filter:
          groupColor && theme.mode === 'dark' ? 'brightness(1.5)' : undefined,
      }}
    >
      <Icon fontSize={16} />
    </span>
  )
}
