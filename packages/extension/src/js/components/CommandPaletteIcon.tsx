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
} from 'icons/actionIcons'
import {
  AppearanceIcon,
  CleanDuplicatesIcon,
  ClosePaletteIcon,
  ClusterIcon,
  CollapseIcon,
  CsvIcon,
  ExpandIcon,
  JsonIcon,
  LinkIcon,
  MarkdownIcon,
  NewWindowIcon,
  ReloadIcon,
  SettingsPaletteIcon,
  SortPaletteIcon,
  SyncPaletteIcon,
  TextDocumentIcon,
  TitleIcon,
  TsvIcon,
  UngroupIcon,
  UnpinIcon,
} from 'icons/paletteIcons'
import { useAppTheme } from 'libs/appTheme'
import { getChromeTabGroupColor } from 'libs/chromeTabGroupColors'
import type { PaletteIconName } from 'stores/ActionStore'

const icons: Record<PaletteIconName, React.ComponentType<BaseSvgIconProps>> = {
  reload: ReloadIcon,
  copy: CopyTextIcon,
  url: LinkIcon,
  title: TitleIcon,
  'title-url': TextDocumentIcon,
  csv: CsvIcon,
  tsv: TsvIcon,
  json: JsonIcon,
  markdown: MarkdownIcon,
  export: ExportTabsIcon,
  move: MoveTabsIcon,
  'new-window': NewWindowIcon,
  window: BrowserWindowIcon,
  group: TabGroupIcon,
  pin: PinTabIcon,
  unpin: UnpinIcon,
  close: ClosePaletteIcon,
  ungroup: UngroupIcon,
  expand: ExpandIcon,
  collapse: CollapseIcon,
  sort: SortPaletteIcon,
  select: SelectTabsIcon,
  deselect: DeselectTabsIcon,
  'clean-duplicates': CleanDuplicatesIcon,
  cluster: ClusterIcon,
  sync: SyncPaletteIcon,
  settings: SettingsPaletteIcon,
  keyboard: KeyboardShortcutsIcon,
  theme: AppearanceIcon,
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
  const Icon = icons[name]

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
