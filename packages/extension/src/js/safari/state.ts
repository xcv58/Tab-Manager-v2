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
  closeIDs = new Set<number>()
  removingTabIDs = new Set<number>()
  closeWindow: { id: number; tabCount: number } | null = null
  progress: SafariActionProgress | null = null
  private closeReply: ((approved: boolean) => void) | null = null

  constructor() {
    makeAutoObservable<SafariState, 'closeReply'>(this, { closeReply: false })
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

  get confirmationOpen() {
    return this.closeWindow !== null || this.closeIDs.size > 0
  }

  private requestClose = (
    ids: number[],
    win?: { id: number; tabCount: number },
  ) => {
    if (this.closeReply) {
      this.error = 'Finish the current confirmation first.'
      return Promise.resolve(false)
    }
    if (!win && !ids.length) return Promise.resolve(false)
    this.closeIDs = new Set(ids)
    this.closeWindow = win || null
    return new Promise<boolean>((resolve) => {
      this.closeReply = resolve
    })
  }

  confirmClose = (ids: number[]) => this.requestClose(ids)
  confirmWindowClose = (id: number, ids: number[]) =>
    this.requestClose(ids, { id, tabCount: ids.length })

  finishClose = (approved: boolean) => {
    const reply = this.closeReply
    this.closeReply = null
    this.closeIDs.clear()
    this.closeWindow = null
    reply?.(approved)
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
