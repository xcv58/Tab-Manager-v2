import React from 'react'
import { observer } from 'mobx-react'
import { browser } from 'libs'
import Dialog from '@material-ui/core/Dialog'
import DialogTitle from '@material-ui/core/DialogTitle'
import DialogContent from '@material-ui/core/DialogContent'
import Divider from '@material-ui/core/Divider'
import FormGroup from '@material-ui/core/FormGroup'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import FormHelperText from '@material-ui/core/FormHelperText'
import Fade from '@material-ui/core/Fade'
import Switch from '@material-ui/core/Switch'
import { useStore } from 'components/StoreContext'
import Slider from '@material-ui/core/Slider'
import FormLabel from '@material-ui/core/FormLabel'
import Select from '@material-ui/core/Select'
import MenuItem from '@material-ui/core/MenuItem'
import FormControl from '@material-ui/core/FormControl'
import InputLabel from '@material-ui/core/InputLabel'
import { THEMES } from 'stores/UserStore'

export default observer(() => {
  const { userStore } = useStore()
  const {
    dialogOpen,
    closeDialog,
    highlightDuplicatedTab,
    toggleHighlightDuplicatedTab,
    showTabTooltip,
    toggleShowTabTooltip,
    preserveSearch,
    togglePreserveSearch,
    showUnmatchedTab,
    toggleShowUnmatchedTab,
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
    showTabIcon,
    toggleShowTabIcon,
    theme,
    selectTheme
  } = userStore
  return (
    <Dialog
      open={dialogOpen}
      fullWidth
      TransitionComponent={Fade}
      onClose={closeDialog}
      onBackdropClick={closeDialog}
    >
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <FormControl className='w-full'>
          <FormGroup>
            <FormHelperText>Search</FormHelperText>
            <FormControlLabel
              label='Preserve Search'
              control={
                <Switch
                  color='primary'
                  checked={preserveSearch}
                  onChange={togglePreserveSearch}
                />
              }
            />
            <FormControlLabel
              label='Auto Focus Search Box'
              control={
                <Switch
                  color='primary'
                  checked={autoFocusSearch}
                  onChange={toggleAutoFocusSearch}
                />
              }
            />
            <Divider />
          </FormGroup>
          <FormGroup>
            <FormHelperText>Views</FormHelperText>
            <FormControlLabel
              label='Highlight Duplicated Tabs'
              control={
                <Switch
                  color='primary'
                  checked={highlightDuplicatedTab}
                  onChange={toggleHighlightDuplicatedTab}
                />
              }
            />
            <FormControlLabel
              label='Show Unmatched Tab'
              control={
                <Switch
                  color='primary'
                  checked={showUnmatchedTab}
                  onChange={toggleShowUnmatchedTab}
                />
              }
            />
            <FormLabel>Minimum Tab Width</FormLabel>
            <Slider
              defaultValue={tabWidth}
              step={1}
              min={15}
              max={50}
              marks
              onChange={(_, value) => updateTabWidth(value)}
              valueLabelDisplay='auto'
              aria-labelledby='update-tab-width'
              aria-label='Update Tab Width'
            />
            <Divider />
          </FormGroup>
          <FormGroup>
            <FormHelperText>Individual Tab</FormHelperText>
            <FormControlLabel
              label='Show Tab Icon'
              control={
                <Switch
                  color='primary'
                  checked={showTabIcon}
                  onChange={toggleShowTabIcon}
                />
              }
            />
            <FormControlLabel
              label='Show URL'
              control={
                <Switch
                  color='primary'
                  checked={showUrl}
                  onChange={toggleShowUrl}
                />
              }
            />
            <FormControlLabel
              label='Show Tab Tooltip'
              control={
                <Switch
                  color='primary'
                  checked={showTabTooltip}
                  onChange={toggleShowTabTooltip}
                />
              }
            />
            <Divider />
          </FormGroup>
          <FormGroup>
            <FormHelperText>Others</FormHelperText>
            <FormControlLabel
              label='Show Shortcut Hint'
              control={
                <Switch
                  color='primary'
                  checked={showShortcutHint}
                  onChange={toggleShowShortcutHint}
                />
              }
            />
            <FormControlLabel
              label='Always Show Toolbar'
              control={
                <Switch
                  color='primary'
                  checked={!toolbarAutoHide}
                  onChange={toggleAutoHide}
                />
              }
            />
            <FormControl>
              <InputLabel id='theme'>Theme</InputLabel>
              <Select
                id='theme'
                value={theme}
                onChange={(e) => {
                  selectTheme(e.target.value)
                }}
                className='capitalize'
              >
                {THEMES.map((t) => (
                  <MenuItem key={t} value={t} className='capitalize'>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </FormGroup>
        </FormControl>
        <Divider />
        <div className='text-sm text-right opacity-75'>
          v{browser.runtime.getManifest().version}
        </div>
      </DialogContent>
    </Dialog>
  )
})
