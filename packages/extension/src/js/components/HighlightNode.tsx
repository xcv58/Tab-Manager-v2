import React from 'react'
import { match } from 'fuzzy'

const pre = "<span class='text-red-500'>"
const post = '</span>'

export default function HighlightNode({
  query,
  text,
}: {
  query: string
  text: string
}) {
  const result = match(query, text, { pre, post })
  if (!result) {
    return <div>{text}</div>
  }
  return <div dangerouslySetInnerHTML={{ __html: result.rendered }} />
}
