'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getPlaylist } from '@/lib/utils'

export default function GameNav({ position = 'top' }) {
  const router = useRouter()
  const pathname = usePathname()
  const [prev, setPrev] = useState(null)
  const [next, setNext] = useState(null)
  const [pos, setPos] = useState('')

  useEffect(() => {
    const items = getPlaylist()
    if (items.length < 2) return
    const idx = items.findIndex(i => i.href === pathname)
    if (idx === -1) return
    if (idx > 0) setPrev(items[idx - 1])
    if (idx < items.length - 1) setNext(items[idx + 1])
    setPos(`${idx + 1} of ${items.length}`)
  }, [pathname])

  // Swipe detection (top instance only)
  useEffect(() => {
    if (position !== 'top') return
    let startX = 0, startY = 0
    function onStart(e) { startX = e.touches[0].clientX; startY = e.touches[0].clientY }
    function onEnd(e) {
      const dx = e.changedTouches[0].clientX - startX
      const dy = e.changedTouches[0].clientY - startY
      if (Math.abs(dx) > 75 && Math.abs(dy) < 50) {
        const items = getPlaylist()
        const idx = items.findIndex(i => i.href === pathname)
        if (idx === -1) return
        if (dx > 0 && idx > 0) router.replace(items[idx - 1].href)
        if (dx < 0 && idx < items.length - 1) router.replace(items[idx + 1].href)
      }
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => { document.removeEventListener('touchstart', onStart); document.removeEventListener('touchend', onEnd) }
  }, [position, pathname, router])

  if (!prev && !next) return null

  function go(item) {
    setPrev(null)
    setNext(null)
    router.replace(item.href)
  }

  // Bottom: just text
  if (position === 'bottom') {
    if (!next) return null
    return (
      <div onClick={() => go(next)} style={{ padding:'16px 20px 8px', cursor:'pointer', textAlign:'center' }}>
        <span className="sans" style={{ fontSize:12, color:'var(--copper)', fontWeight:600 }}>Up next: {next.title} &rarr;</span>
        {pos && <span className="sans" style={{ fontSize:10, color:'var(--dim)', marginLeft:8 }}>({pos})</span>}
      </div>
    )
  }

  // Top: compact prev/next arrows with breathing room below
  return (
    <div style={{ display:'flex', alignItems:'stretch', borderBottom:'1px solid var(--faint)', marginBottom:8, fontFamily:'var(--ui)' }}>
      <div
        onClick={() => prev && go(prev)}
        style={{ flex:1, padding:'10px 14px', cursor: prev ? 'pointer' : 'default', color: prev ? 'var(--copper)' : 'transparent', display:'flex', alignItems:'center', gap:4, minWidth:0 }}
      >
        {prev && <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{flexShrink:0}}><path d="M15 18l-6-6 6-6"/></svg>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:11 }}>{prev.title}</span>
        </>}
      </div>
      {pos && <div style={{ padding:'10px 8px', fontSize:9, color:'var(--dim)', letterSpacing:1, fontWeight:600, whiteSpace:'nowrap', display:'flex', alignItems:'center' }}>{pos}</div>}
      <div
        onClick={() => next && go(next)}
        style={{ flex:1, padding:'10px 14px', cursor: next ? 'pointer' : 'default', color: next ? 'var(--copper)' : 'transparent', display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end', minWidth:0 }}
      >
        {next && <>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:11 }}>{next.title}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{flexShrink:0}}><path d="M9 18l6-6-6-6"/></svg>
        </>}
      </div>
    </div>
  )
}
