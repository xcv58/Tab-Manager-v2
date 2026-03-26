import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@mui/material/Tooltip'
import ButtonBase from '@mui/material/ButtonBase'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import ViewColumn from '@mui/icons-material/ViewColumn'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const TITLE = 'Refresh layout'

export default observer(() => {
  const { windowStore } = useStore()

  if (!windowStore.layoutDirty) {
    return null
  }

  return (
    <Tooltip title={TITLE} enterDelay={TOOLTIP_DELAY}>
      <ButtonBase
        onClick={() => windowStore.repackLayoutAndRevealActiveTab('mouse')}
        aria-label={TITLE}
        data-testid="layout-repack-button"
        sx={(theme) => ({
          ml: 0.75,
          mr: 0.75,
          px: 1.15,
          height: 28,
          flexShrink: 0,
          borderRadius: '10px',
          border: '1px solid',
          borderColor: theme.palette.divider,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.secondary,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          whiteSpace: 'nowrap',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 1px 2px rgba(0, 0, 0, 0.45)'
              : '0 1px 2px rgba(15, 23, 42, 0.08)',
          transition: theme.transitions.create(
            ['background-color', 'border-color', 'box-shadow', 'color'],
            { duration: theme.transitions.duration.shorter },
          ),
          '&:hover': {
            borderColor: theme.palette.primary.light,
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(144, 202, 249, 0.12)'
                : 'rgba(25, 118, 210, 0.08)',
            color: theme.palette.text.primary,
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 2px 5px rgba(0, 0, 0, 0.5)'
                : '0 2px 6px rgba(15, 23, 42, 0.14)',
          },
          '&:focus-visible': {
            outline: 'none',
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 0 2px ${theme.palette.background.paper}, 0 0 0 4px ${theme.palette.primary.main}`,
          },
        })}
      >
        <Box
          data-testid="layout-dirty-indicator"
          sx={(theme) => ({
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: theme.palette.warning.main,
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 0 0 1px rgba(0, 0, 0, 0.45)'
                : '0 0 0 1px rgba(255, 255, 255, 0.9)',
          })}
          aria-hidden="true"
        />
        <ViewColumn sx={{ fontSize: 16 }} aria-hidden="true" />
        <Typography
          component="span"
          sx={{
            fontSize: '0.72rem',
            lineHeight: 1,
            letterSpacing: '0.01em',
            fontWeight: 700,
          }}
        >
          Relayout
        </Typography>
      </ButtonBase>
    </Tooltip>
  )
})
