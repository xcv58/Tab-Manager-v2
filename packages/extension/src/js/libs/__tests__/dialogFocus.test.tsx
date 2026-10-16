import {
  captureDialogFocusTarget,
  restoreDialogFocusTarget,
} from 'libs/dialogFocus'

describe('dialogFocus', () => {
  afterEach(() => {
    document.body.replaceChildren()
    jest.restoreAllMocks()
  })

  it.each(['removed', 'disabled', 'hidden', 'aria-hidden', 'inert'])(
    'uses the search fallback when the opener is %s',
    (state) => {
      let nextFrame: FrameRequestCallback
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        nextFrame = cb
        return 0
      })
      document.body.innerHTML =
        '<div id="parent"><button id="opener">Open</button></div><input id="search">'
      const opener = document.getElementById('opener')!
      const search = document.getElementById('search')!
      restoreDialogFocusTarget(opener, () => search)
      if (state === 'removed') opener.remove()
      else if (state === 'disabled') opener.setAttribute('disabled', '')
      else
        document
          .getElementById('parent')!
          .setAttribute(state, state === 'aria-hidden' ? 'true' : '')
      nextFrame(0)
      expect(search).toHaveFocus()
    },
  )
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
