import React from 'react'
import { observer } from 'mobx-react-lite'
import { browser } from 'libs'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import Fade from '@mui/material/Fade'
import Switch from '@mui/material/Switch'
import { useStore } from 'components/hooks/useStore'
import Slider from '@mui/material/Slider'
import FormLabel from '@mui/material/FormLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import { THEMES } from 'stores/UserStore'
import useReduceMotion from 'libs/useReduceMotion'
import { defaultTransitionDuration } from 'libs/transition'
import SponsorButton from './SponsorButton'
import FeedbackButton from './FeedbackButton'
import TabRowPreview from './TabRowPreview'

const SettingsPanel = ({
  title,
  description,
  children,
  style,
  testId,
}: {
  title: string
  description?: string
  children: React.ReactNode
  style: React.CSSProperties
  testId?: string
}) => (
  <div className="rounded-xl border p-4" style={style} data-testid={testId}>
    <div className="mb-3">
      <Typography component="h4" sx={{ fontSize: '0.92rem', fontWeight: 700 }}>
        {title}
      </Typography>
      {description && (
        <FormHelperText sx={{ mt: 0.5, fontSize: '0.8rem' }}>
          {description}
        </FormHelperText>
      )}
    </div>
    {children}
  </div>
)

const PreviewSurface = ({
  children,
  style,
  testId,
}: {
  children: React.ReactNode
  style: React.CSSProperties
  testId?: string
}) => (
  <div
    data-testid={testId}
    className="w-full min-w-0 overflow-hidden rounded-lg border xl:min-w-72"
    style={style}
  >
    {children}
  </div>
)

const RowDetailsOption = ({
  title,
  description,
  checked,
  onChange,
  preview,
  previewHint,
  style,
  testId,
}: {
  title: string
  description: string
  checked: boolean
  onChange: () => void
  preview: React.ReactNode
  previewHint?: string
  style: React.CSSProperties
  testId?: string
}) => (
  <div
    data-testid={testId}
    className="flex flex-col gap-3 rounded-lg border px-3 py-3 xl:flex-row xl:items-center xl:gap-4"
    style={style}
  >
    <div className="min-w-0 xl:w-64 xl:shrink-0">
      <div className="mb-1 flex items-start justify-between gap-3">
        <Typography
          component="h5"
          sx={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.35 }}
        >
          {title}
        </Typography>
        <Switch
          color="primary"
          checked={checked}
          onChange={onChange}
          inputProps={{ 'aria-label': title }}
        />
      </div>
      <FormHelperText sx={{ mt: 0, fontSize: '0.78rem' }}>
        {description}
      </FormHelperText>
    </div>
    <div className="min-w-0 xl:flex-1">
      {preview}
      {previewHint && (
        <FormHelperText sx={{ mt: 0.75, fontSize: '0.74rem' }}>
          {previewHint}
        </FormHelperText>
      )}
    </div>
  </div>
)

export default observer(() => {
  const { userStore } = useStore()
  const muiTheme = useTheme()
  const {
    dialogOpen,
    closeDialog,
    highlightDuplicatedTab,
    toggleHighlightDuplicatedTab,
    showTabTooltip,
    toggleShowTabTooltip,
    preserveSearch,
    togglePreserveSearch,
    searchHistory,
    toggleSearchHistory,
    showAppWindow,
    toggleShowAppWindow,
    showUnmatchedTab,
    toggleShowUnmatchedTab,
    litePopupMode,
    toggleLitePopupMode,
    showShortcutHint,
    toggleShowShortcutHint,
    toolbarAutoHide,
    toggleAutoHide,
    showUrl,
    toggleShowUrl,
    autoFocusSearch,
    toggleAutoFocusSearch,
    tabWidth,
    updateTabWidth,
    fontSize,
    updateFontSize,
    showTabIcon,
    toggleShowTabIcon,
    theme,
    selectTheme,
  } = userStore
  const reduceMotion = useReduceMotion()
  const isDarkMode = muiTheme.palette.mode === 'dark'
  const panelStyle: React.CSSProperties = {
    backgroundColor: isDarkMode
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(246, 248, 252, 0.94)',
    borderColor: isDarkMode
      ? 'rgba(238, 241, 245, 0.14)'
      : 'rgba(148, 163, 184, 0.26)',
  }
  const rowDetailOptionStyle: React.CSSProperties = {
    backgroundColor: isDarkMode
      ? 'rgba(255, 255, 255, 0.02)'
      : 'rgba(255, 255, 255, 0.5)',
    borderColor: isDarkMode
      ? 'rgba(238, 241, 245, 0.1)'
      : 'rgba(148, 163, 184, 0.22)',
  }
  const previewSurfaceStyle: React.CSSProperties = {
    backgroundColor: isDarkMode
      ? 'rgba(15, 23, 42, 0.34)'
      : 'rgba(255, 255, 255, 0.72)',
    borderColor: isDarkMode
      ? 'rgba(238, 241, 245, 0.12)'
      : 'rgba(148, 163, 184, 0.24)',
  }
  return (
    <Dialog
      open={dialogOpen}
      fullWidth
      maxWidth="lg"
      TransitionComponent={Fade}
      transitionDuration={reduceMotion ? 1 : defaultTransitionDuration}
      onClose={closeDialog}
      onBackdropClick={closeDialog}
    >
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <div className="grid gap-3 py-1 lg:grid-cols-2">
          <SettingsPanel
            testId="settings-panel-search"
            title="Search behavior"
            description="Tune how the search box behaves when the popup opens and while you search."
            style={panelStyle}
          >
            <FormGroup>
              <FormControlLabel
                label="Preserve search"
                control={
                  <Switch
                    color="primary"
                    checked={preserveSearch}
                    onChange={togglePreserveSearch}
                  />
                }
              />
              <FormControlLabel
                label="Include browser history in results"
                control={
                  <Switch
                    color="primary"
                    checked={searchHistory}
                    onChange={toggleSearchHistory}
                  />
                }
              />
              <FormControlLabel
                label="Focus search on open"
                control={
                  <Switch
                    color="primary"
                    checked={autoFocusSearch}
                    onChange={toggleAutoFocusSearch}
                  />
                }
              />
            </FormGroup>
          </SettingsPanel>
          <SettingsPanel
            testId="settings-panel-theme-density"
            title="Theme & density"
            description="Set the overall tone and reading size for the page."
            style={panelStyle}
          >
            <FormControl variant="standard" sx={{ mb: 2 }} className="w-full">
              <InputLabel id="theme-label">Theme</InputLabel>
              <Select
                id="theme-select"
                value={theme}
                onChange={(e) => {
                  selectTheme(e.target.value)
                }}
                className="capitalize"
              >
                {THEMES.map((t) => (
                  <MenuItem key={t} value={t} className="capitalize">
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormLabel>Font size: `{fontSize}px`</FormLabel>
            <Slider
              defaultValue={fontSize}
              step={1}
              min={6}
              max={36}
              marks
              onChange={(_, value: number) => updateFontSize(value)}
              valueLabelDisplay="auto"
              aria-labelledby="update-font-size"
              aria-label="Update Font Size"
            />
            <FormLabel>Minimum tab width: `{tabWidth}rem`</FormLabel>
            <Slider
              defaultValue={tabWidth}
              step={1}
              min={15}
              max={50}
              marks
              onChange={(_, value: number) => updateTabWidth(value)}
              valueLabelDisplay="auto"
              aria-labelledby="update-tab-width"
              aria-label="Update Tab Width"
            />
          </SettingsPanel>
          <SettingsPanel
            testId="settings-panel-tab-display"
            title="Tab display"
            description="Choose which details each tab shows by default."
            style={panelStyle}
          >
            <div className="space-y-3" data-testid="row-details-options">
              <RowDetailsOption
                testId="row-details-option-duplicates"
                title="Mark duplicate tabs"
                description="Show the duplicate marker on tabs that share the same page."
                checked={highlightDuplicatedTab}
                onChange={toggleHighlightDuplicatedTab}
                style={rowDetailOptionStyle}
                preview={
                  <PreviewSurface
                    style={previewSurfaceStyle}
                    testId="row-details-preview-duplicates"
                  >
                    <TabRowPreview
                      config={{
                        id: 9101,
                        title: 'Tab Manager issue tracker',
                        url: 'https://github.com/xcv58/Tab-Manager-v2/issues/2580',
                        duplicatedTabCount: 2,
                        showDuplicateMarker: highlightDuplicatedTab,
                        showTabIcon: true,
                        showUrl: true,
                        showTabTooltip: false,
                      }}
                    />
                  </PreviewSurface>
                }
              />
              <RowDetailsOption
                testId="row-details-option-icons"
                title="Show tab icons"
                description="Use the real tab leading slot so hover reveals the same selection and action controls."
                checked={showTabIcon}
                onChange={toggleShowTabIcon}
                style={rowDetailOptionStyle}
                previewHint="Hover the preview tab to inspect the real hover state."
                preview={
                  <PreviewSurface
                    style={previewSurfaceStyle}
                    testId="row-details-preview-icons"
                  >
                    <TabRowPreview
                      config={{
                        id: 9102,
                        title: 'Tab Manager settings dialog',
                        url: 'https://github.com/xcv58/Tab-Manager-v2',
                        showDuplicateMarker: false,
                        showTabIcon,
                        showUrl: true,
                        showTabTooltip: false,
                      }}
                    />
                  </PreviewSurface>
                }
              />
              <RowDetailsOption
                testId="row-details-option-urls"
                title="Show URLs"
                description="Add the URL line below the title so similar pages are easier to scan."
                checked={showUrl}
                onChange={toggleShowUrl}
                style={rowDetailOptionStyle}
                preview={
                  <PreviewSurface
                    style={previewSurfaceStyle}
                    testId="row-details-preview-urls"
                  >
                    <TabRowPreview
                      config={{
                        id: 9103,
                        title: 'Preview URLs inside settings',
                        url: 'https://github.com/xcv58/Tab-Manager-v2/issues/2580',
                        showDuplicateMarker: false,
                        showTabIcon: true,
                        showUrl,
                        showTabTooltip: false,
                      }}
                    />
                  </PreviewSurface>
                }
              />
              <RowDetailsOption
                testId="row-details-option-tooltips"
                title="Show tab tooltips"
                description="Use the actual tooltip so the preview tab can surface the full title and URL on hover."
                checked={showTabTooltip}
                onChange={toggleShowTabTooltip}
                style={rowDetailOptionStyle}
                previewHint="Hover the preview tab to open the tooltip."
                preview={
                  <PreviewSurface
                    style={previewSurfaceStyle}
                    testId="row-details-preview-tooltips"
                  >
                    <TabRowPreview
                      config={{
                        id: 9104,
                        title: 'Hover this preview tab for tooltip details',
                        url: 'https://github.com/xcv58/Tab-Manager-v2/issues/2580',
                        duplicatedTabCount: 2,
                        showDuplicateMarker: false,
                        showTabIcon: true,
                        showUrl: false,
                        showTabTooltip,
                      }}
                    />
                  </PreviewSurface>
                }
              />
            </div>
          </SettingsPanel>
          <SettingsPanel
            testId="settings-panel-behavior"
            title="Behavior"
            description="Choose what stays visible and how the extension behaves in compact mode."
            style={panelStyle}
          >
            <div className="space-y-4">
              <div>
                <Typography
                  component="h5"
                  sx={{ fontSize: '0.84rem', fontWeight: 700 }}
                >
                  Results visibility
                </Typography>
                <FormHelperText sx={{ mt: 0.5, fontSize: '0.76rem' }}>
                  Decide how much stays on screen while filtering and scanning.
                </FormHelperText>
                <FormGroup sx={{ mt: 1.25 }}>
                  <FormControlLabel
                    label="Keep non-matching tabs visible"
                    control={
                      <Switch
                        color="primary"
                        checked={showUnmatchedTab}
                        onChange={toggleShowUnmatchedTab}
                      />
                    }
                  />
                  <FormControlLabel
                    label="Include app windows"
                    control={
                      <Switch
                        color="primary"
                        checked={showAppWindow}
                        onChange={toggleShowAppWindow}
                      />
                    }
                  />
                </FormGroup>
              </div>
              <div
                className="border-t pt-4"
                style={{ borderColor: rowDetailOptionStyle.borderColor }}
              >
                <Typography
                  component="h5"
                  sx={{ fontSize: '0.84rem', fontWeight: 700 }}
                >
                  Compact mode
                </Typography>
                <FormHelperText sx={{ mt: 0.5, fontSize: '0.76rem' }}>
                  Tune how much UI stays visible when the extension is used in
                  tight spaces.
                </FormHelperText>
                <FormGroup sx={{ mt: 1.25 }}>
                  <FormControlLabel
                    label="Use lite popup mode"
                    control={
                      <Switch
                        color="primary"
                        checked={litePopupMode}
                        onChange={toggleLitePopupMode}
                      />
                    }
                  />
                  <FormControlLabel
                    label="Show shortcut hints"
                    control={
                      <Switch
                        color="primary"
                        checked={showShortcutHint}
                        onChange={toggleShowShortcutHint}
                      />
                    }
                  />
                  <FormControlLabel
                    label="Keep toolbar visible"
                    aria-labelledby="toggle-always-show-toolbar"
                    aria-label="Toggle Always Show Toolbar"
                    control={
                      <Switch
                        color="primary"
                        checked={!toolbarAutoHide}
                        onChange={toggleAutoHide}
                      />
                    }
                  />
                </FormGroup>
              </div>
            </div>
          </SettingsPanel>
        </div>
        <div
          className="mt-6 flex items-center justify-between border-t pt-4"
          style={{ borderColor: panelStyle.borderColor }}
        >
          <div className="flex items-center gap-2 opacity-80">
            <SponsorButton />
            <FeedbackButton />
          </div>
          <div className="text-sm text-right opacity-65">
            v{browser.runtime.getManifest().version}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
