import React from 'react'

export interface BaseSvgIconProps extends React.SVGProps<SVGSVGElement> {
  /** Font-size style for the icon (number = px, or CSS string). Defaults to 24. */
  fontSize?: number | string
  /** Additional class names */
  className?: string
}

/**
 * Minimal SVG icon wrapper replacing MUI `SvgIcon`.
 * Renders a 24×24 viewBox SVG that inherits `currentColor`.
 */
const BaseSvgIcon = React.forwardRef<SVGSVGElement, BaseSvgIconProps>(
  ({ children, fontSize = 24, className, style, ...rest }, ref) => {
    const size = typeof fontSize === 'number' ? `${fontSize}px` : fontSize
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
        className={className}
        style={{ width: size, height: size, ...style }}
        {...rest}
      >
        {children}
      </svg>
    )
  },
)

BaseSvgIcon.displayName = 'BaseSvgIcon'

export default BaseSvgIcon
