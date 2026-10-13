import React from 'react'
import type { BaseSvgIconProps } from 'icons/BaseSvgIcon'
import {
  CopyTextIcon,
  DeselectTabsIcon,
  KeyboardShortcutsIcon,
  PinTabIcon,
  SelectTabsIcon,
  UngroupTabIcon,
} from 'icons/actionIcons'
import {
  ChevronRightIcon,
  CloseIcon,
  DarkModeRoundedIcon,
  DeleteSweepIcon,
  DesktopWindowsRoundedIcon,
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
import type { PaletteIconName } from 'stores/ActionStore'

const icons: Record<PaletteIconName, React.ComponentType<BaseSvgIconProps>> = {
  reload: RefreshIcon,
  copy: CopyTextIcon,
  move: OpenInNewIcon,
  window: DesktopWindowsRoundedIcon,
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
}: {
  name: PaletteIconName
  danger?: boolean
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
        color: danger ? undefined : theme.palette.text.secondary,
      }}
    >
      <Icon fontSize={16} />
    </span>
  )
}
