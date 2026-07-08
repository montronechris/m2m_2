'use client'

import { useEffect, useState } from 'react'

function getSrc() {
  return window.localStorage.getItem('m2m-lang') === 'en' ? '/403-en.html' : '/403.html'
}

export default function ForbiddenPage() {
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
      title="403"
      style={{ border: 0, width: '100%', height: '100vh', display: 'block' }}
    />
  )
}
