import { makeAutoObservable } from 'mobx'

class SafariState {
  error = ''
  // Counts keep overlapping close requests from clearing each other's focus
  // exclusions before Safari has delivered its removal events.
  removingTabIDs = new Map<number, number>()

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
  startRemovingTabs = (ids: number[]) => {
    for (const id of ids)
      this.removingTabIDs.set(id, (this.removingTabIDs.get(id) || 0) + 1)
  }
  finishRemovingTabs = (ids: number[]) => {
    for (const id of ids) {
      const count = (this.removingTabIDs.get(id) || 0) - 1
      if (count > 0) this.removingTabIDs.set(id, count)
      else this.removingTabIDs.delete(id)
    }
  }
}

export const safariState = new SafariState()
