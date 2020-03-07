import React from 'react'

export default props => {
  const { onClick, disabled } = props
  return (
    <button
      {...{
        onClick,
        disabled
      }}
      className='inline-flex items-center justify-center w-8 h-8 p-4 m-2 text-red-300 bg-transparent rounded-full hover:text-red-500 hover:bg-red-100 focus:outline-none focus:shadow-outline active:bg-red-300 active:text-red-700'
    >
      x
    </button>
  )
}
