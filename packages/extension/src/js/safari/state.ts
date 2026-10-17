import { makeAutoObservable } from 'mobx'

export type SafariActionProgress = {
  id: string
  action: string
  state: 'queued' | 'running' | 'done' | 'failed' | 'cancelled'
  completed: number
  total: number
  error?: string
}

class SafariState {
  error = ''
  removingTabIDs = new Set<number>()
  progress: SafariActionProgress | null = null

  constructor() {
    makeAutoObservable(this)
  }

  showError = (error: unknown) => {
    this.error =
      error instanceof Error
        ? error.message
        : 'Safari could not complete this action. Refresh the view and try again.'
  }
  dismissError = () => {
    this.error = ''
  }
  setProgress = (progress: SafariActionProgress | null) => {
    this.progress = progress
  }

  setRemovingTabs = (ids: number[]) => {
    this.removingTabIDs = new Set(ids)
  }
}

export const safariState = new SafariState()

// Both the Stop button and keyboard shortcut cancel the same foreground job.
export const cancelSafariAction = async () => {
  const id = safariState.progress?.id
  if (!id) return
  const response = await (globalThis as any).browser.runtime.sendMessage({
    kind: 'safari-action-cancel',
    id,
  })
  if (!response?.ok)
    throw new Error(response?.error || 'Safari could not stop this action.')
}
