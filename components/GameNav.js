'use client'
import { useState, useEffect } from 'react'
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

  if (!prev && !next) return null

  function go(item) {
    setPrev(null)
    setNext(null)
    router.replace(item.href)
  }

  // Bottom: show prominent "UP NEXT" card
  if (position === 'bottom') {
    if (!next) return null
    return (
      <div onClick={() => go(next)} style={{ margin:'0 20px 20px', padding:'16px 20px', background:'var(--card)', border:'1px solid var(--faint)', borderTop:'3px solid var(--copper)', cursor:'pointer' }}>
        <div className="sans" style={{ fontSize:9, color:'var(--copper)', letterSpacing:2, fontWeight:700, marginBottom:6 }}>UP NEXT {pos ? `\u00B7 ${pos}` : ''}</div>
        <div style={{ fontSize:15, color:'var(--ink)', lineHeight:1.3 }}>{next.title}</div>
        <div className="sans" style={{ fontSize:11, color:'var(--dim)', marginTop:6 }}>Keep scrolling &rarr;</div>
      </div>
    )
  }

  // Top: compact prev/next arrows
  return (
    <div style={{ display:'flex', alignItems:'stretch', borderBottom:'1px solid var(--faint)', fontFamily:'Arial,sans-serif' }}>
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
