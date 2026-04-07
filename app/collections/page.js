'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import TopLogo from '@/components/TopLogo'
import BackButton from '@/components/BackButton'

export default function CollectionsPage() {
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('notable_games').select('title,collections,sport,tier')
      if (!data) { setLoading(false); return }

      const map = {}
      data.forEach(g => {
        if (!g.collections) return
        g.collections.forEach(c => {
          if (!map[c]) map[c] = { name: c, count: 0, games: [], allTimerCount: 0 }
          map[c].count++
          if (g.tier === 1) map[c].allTimerCount++
          if (map[c].games.length < 3) map[c].games.push({ title: g.title, sport: g.sport, tier: g.tier })
        })
      })

      const sorted = Object.values(map).sort((a, b) => b.count - a.count)
      setCollections(sorted)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div>
      <TopLogo />
      <BackButton />
      <div style={{ padding:'20px 20px 0' }}>
        <div style={{ fontSize:22, color:'var(--ink)', marginBottom:4 }}>Collections</div>
        <div className="sans" style={{ fontSize:11, color:'var(--dim)', marginBottom:20 }}>{collections.length} collections, {collections.reduce((s,c) => s + c.count, 0)} total games</div>
      </div>

      {collections.map(c => (
        <Link key={c.name} href={`/collection/${encodeURIComponent(c.name)}`} style={{ display:'block', padding:'16px 20px', borderTop:'1px solid var(--faint)', textDecoration:'none' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <div style={{ fontSize:16, color:'var(--ink)' }}>{c.name}</div>
            <div className="sans" style={{ fontSize:11, color:'var(--dim)' }}>{c.count} game{c.count !== 1 ? 's' : ''}</div>
          </div>
          <div className="sans" style={{ fontSize:11, color:'var(--muted)', marginTop:6, lineHeight:1.6 }}>
            {c.games.map((g, i) => (
              <span key={i}>
                {g.tier === 1 && <span style={{ color:'var(--gold)' }}>&#9733; </span>}
                <span>{g.title}</span>
                {i < c.games.length - 1 && <span style={{ color:'var(--faint)', margin:'0 6px' }}>&middot;</span>}
              </span>
            ))}
            {c.count > 3 && <span style={{ color:'var(--dim)' }}> +{c.count - 3} more</span>}
          </div>
        </Link>
      ))}

      <div style={{ height:80 }}></div>
    </div>
  )
}
