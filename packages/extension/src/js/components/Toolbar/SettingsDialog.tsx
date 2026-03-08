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

const SettingsSection = ({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) => (
  <section className="space-y-3">
    <div>
      <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 700 }}>
        {title}
      </Typography>
      {description && (
        <FormHelperText sx={{ mt: 0.75, fontSize: '0.82rem' }}>
          {description}
        </FormHelperText>
      )}
    </div>
    {children}
  </section>
)

const SettingsPanel = ({
  title,
  description,
  children,
  style,
}: {
  title: string
  description?: string
  children: React.ReactNode
  style: React.CSSProperties
}) => (
  <div className="rounded-xl border p-4" style={style}>
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
  const panelStyle: React.CSSProperties = {
    backgroundColor:
      muiTheme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.03)'
        : 'rgba(246, 248, 252, 0.94)',
    borderColor:
      muiTheme.palette.mode === 'dark'
        ? 'rgba(238, 241, 245, 0.14)'
        : 'rgba(148, 163, 184, 0.26)',
  }
  return (
    <Dialog
      open={dialogOpen}
      fullWidth
      maxWidth="md"
      TransitionComponent={Fade}
      transitionDuration={reduceMotion ? 1 : defaultTransitionDuration}
      onClose={closeDialog}
      onBackdropClick={closeDialog}
    >
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <div className="space-y-6 py-1">
          <SettingsSection
            title="Search"
            description="Tune how the search box behaves when the popup opens and while you search."
          >
            <SettingsPanel
              title="Search behavior"
              description="Keep the main search interaction predictable and fast."
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
          </SettingsSection>
          <SettingsSection
            title="Appearance"
            description="Control density, theme, and how much detail each tab row shows."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <SettingsPanel
                title="Theme & density"
                description="Set the overall tone and reading size for the page."
                style={panelStyle}
              >
                <FormControl
                  variant="standard"
                  sx={{ mb: 2 }}
                  className="w-full"
                >
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
                title="Row details"
                description="Choose how much metadata each tab row should show by default."
                style={panelStyle}
              >
                <FormGroup>
                  <FormControlLabel
                    label="Mark duplicate tabs"
                    control={
                      <Switch
                        color="primary"
                        checked={highlightDuplicatedTab}
                        onChange={toggleHighlightDuplicatedTab}
                      />
                    }
                  />
                  <FormControlLabel
                    label="Show tab icons"
                    control={
                      <Switch
                        color="primary"
                        checked={showTabIcon}
                        onChange={toggleShowTabIcon}
                      />
                    }
                  />
                  <FormControlLabel
                    label="Show URLs"
                    control={
                      <Switch
                        color="primary"
                        checked={showUrl}
                        onChange={toggleShowUrl}
                      />
                    }
                  />
                  <FormControlLabel
                    label="Show tab tooltips"
                    control={
                      <Switch
                        color="primary"
                        checked={showTabTooltip}
                        onChange={toggleShowTabTooltip}
                      />
                    }
                  />
                </FormGroup>
              </SettingsPanel>
            </div>
          </SettingsSection>
          <SettingsSection
            title="Behavior"
            description="Choose what stays visible and how the extension behaves in compact mode."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <SettingsPanel
                title="Results visibility"
                description="Decide how much stays on screen while filtering and scanning."
                style={panelStyle}
              >
                <FormGroup>
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
              </SettingsPanel>
              <SettingsPanel
                title="Compact mode"
                description="Tune how much UI stays visible when the extension is used in tight spaces."
                style={panelStyle}
              >
                <FormGroup>
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
              </SettingsPanel>
            </div>
          </SettingsSection>
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
