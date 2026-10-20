import { getPopupWindowBounds } from '../popupWindow'

it.each([
  [1440, 900, 1024, 768],
  [1920, 1080, 1024, 768],
  [3840, 2160, 1920, 1080],
  [800, 600, 800, 600],
])(
  'keeps familiar Chrome sizing within a %s x %s work area',
  (availWidth, availHeight, width, height) => {
    expect(getPopupWindowBounds({ availWidth, availHeight })).toEqual({
      width,
      height,
      left: Math.floor((availWidth - width) / 2),
      top: Math.floor((availHeight - height) / 2),
    })
  },
)

it('centers on a display with a negative desktop origin', () => {
  expect(
    getPopupWindowBounds({
      availWidth: 1920,
      availHeight: 1080,
      availLeft: -1920,
      availTop: -100,
    }),
  ).toEqual({
    width: 1024,
    height: 768,
    left: -1472,
    top: 56,
  })
})

it('uses finite fallback dimensions when display metadata is missing or invalid', () => {
  expect(
    getPopupWindowBounds({
      availWidth: NaN,
      availHeight: -1,
      availLeft: Infinity,
    }),
  ).toEqual({
    width: 1024,
    height: 768,
    left: 0,
    top: 0,
  })
})
