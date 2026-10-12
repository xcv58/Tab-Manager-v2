import React from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import { useAppTheme } from 'libs/appTheme'
import { getUiColorTokens } from 'libs/uiColorTokens'
import { CloseIcon, ExpandMoreIcon, MoreHorizIcon } from 'icons/materialIcons'
import TabRowPreview from './TabRowPreview'

const samples = [
  {
    id: 9200,
    title: 'Tab Manager v2',
    url: 'https://tab.jenny.media/',
    active: true,
  },
  {
    id: 9201,
    title: 'Tab Manager issue tracker',
    url: 'https://github.com/xcv58/Tab-Manager-v2/issues',
    duplicatedTabCount: 2,
  },
  {
    id: 9202,
    title: 'Customize your workspace',
    url: 'https://tab.jenny.media/#features',
    pinned: true,
  },
]

export default observer(function SettingsLivePreview() {
  const { userStore } = useStore()
  const theme = useAppTheme()
  const uiColors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  return (
    <>
      <h2 className="m-0 text-base font-semibold">Preview</h2>
      <p className="mt-1 mb-4 text-xs opacity-70">
        A live preview of your settings.
      </p>
      <div
        aria-hidden="true"
        className="rounded-lg border overflow-hidden"
        style={{
          borderColor: uiColors.windowCardBorderColor,
          backgroundColor: uiColors.settingsPreviewSurface,
          width: '100%',
          maxWidth: `${userStore.tabWidth}em`,
          fontSize: userStore.fontSize,
        }}
      >
        <div
          className="flex items-center gap-2 border-b p-2"
          style={{ borderColor: uiColors.windowCardBorderColor }}
        >
          <span className="h-3 w-3 rounded-sm border opacity-60" />
          <strong className="flex-1 text-sm">3 tabs</strong>
          <ExpandMoreIcon fontSize={16} />
          <MoreHorizIcon fontSize={16} />
          <CloseIcon fontSize={16} />
        </div>
        {samples.map((sample) => (
          <TabRowPreview
            key={sample.id}
            config={{
              ...sample,
              fontSize: userStore.fontSize,
              uiPreset: userStore.uiPreset,
              increaseContrast: userStore.increaseContrast,
              highlightActiveTabsInAllWindows:
                userStore.highlightActiveTabsInAllWindows,
              showDuplicateMarker: userStore.highlightDuplicatedTab,
              showTabIcon: userStore.showTabIcon,
              showUrl: userStore.showUrl,
              showTabTooltip: userStore.showTabTooltip,
              tabTooltipUrlLines: userStore.tabTooltipUrlLines,
            }}
          />
        ))}
      </div>
    </>
  )
})
