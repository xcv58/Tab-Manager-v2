import {
  captureDialogFocusTarget,
  restoreDialogFocusTarget,
} from 'libs/dialogFocus'

describe('dialogFocus', () => {
  it('blurs the active element when capturing dialog focus', () => {
    document.body.innerHTML = '<button id="trigger">Open</button>'
    const trigger = document.getElementById('trigger') as HTMLButtonElement
    trigger.focus()

    const focusTarget = captureDialogFocusTarget()

    expect(focusTarget).toBe(trigger)
    expect(document.activeElement).toBe(document.body)
  })

  it('restores focus to a connected element on the next frame', () => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
    document.body.innerHTML = '<button id="trigger">Open</button>'
    const trigger = document.getElementById('trigger') as HTMLButtonElement

    restoreDialogFocusTarget(trigger)

    expect(document.activeElement).toBe(trigger)
    jest.restoreAllMocks()
  })

  it('skips restoring focus when the target is disconnected', () => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
    document.body.innerHTML = '<button id="trigger">Open</button>'
    const trigger = document.getElementById('trigger') as HTMLButtonElement
    trigger.remove()

    restoreDialogFocusTarget(trigger)

    expect(document.activeElement).toBe(document.body)
    jest.restoreAllMocks()
  })

  it('resolves a replacement element after it mounts on the next frame', () => {
    let nextFrame: FrameRequestCallback
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      nextFrame = cb
      return 0
    })
    document.body.innerHTML = ''
    restoreDialogFocusTarget(() => document.getElementById('replacement'))
    document.body.innerHTML = '<button id="replacement">Result</button>'
    nextFrame(0)
    expect(document.activeElement).toBe(document.getElementById('replacement'))
    jest.restoreAllMocks()
  })
})
