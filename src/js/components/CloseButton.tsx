import React from 'react'

export default props => {
  const { onClick, disabled } = props
  return (
    <button
      {...{ onClick, disabled }}
      className='bg-transparent hover:text-red-700 text-red-300 border-0 py-3 px-4'
    >
      x
    </button>
  )
}
