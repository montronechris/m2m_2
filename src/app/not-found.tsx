'use client'

import { useEffect, useState } from 'react'

function getSrc() {
  return window.localStorage.getItem('m2m-lang') === 'en' ? '/404-en.html' : '/404.html'
}

export default function NotFound() {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    setSrc(getSrc())
    const onPageShow = () => setSrc(getSrc())
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  if (!src) return null

  return (
    <iframe
      src={src}
      title="404"
      style={{ border: 0, width: '100%', height: '100vh', display: 'block' }}
    />
  )
}
