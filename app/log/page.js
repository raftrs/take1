'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { formatDate, sportLabel } from '@/lib/utils'
import TopLogo from '@/components/TopLogo'

export default function LogPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  const doSearch = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    const items = []

    // Notable games first
    const { data: ng } = await supabase.from('notable_games').select('id,title,sport,game_date')
      .ilike('title', `%${q}%`).order('game_date', { ascending: false }).limit(5)
    if (ng) ng.forEach(g => items.push({ type: 'notable', id: g.id, label: g.title, sub: `${sportLabel(g.sport)} \u00B7 ${formatDate(g.game_date)}`, href: `/notable/${g.id}` }))

    // Regular games
    const { data: gm } = await supabase.from('games').select('id,title,home_team_abbr,away_team_abbr,home_score,away_score,game_date,sport,series_info')
      .or(`home_team_abbr.ilike.%${q}%,away_team_abbr.ilike.%${q}%,title.ilike.%${q}%,venue.ilike.%${q}%`)
      .order('game_date', { ascending: false }).limit(10)
    if (gm) gm.forEach(g => {
      const label = g.title || `${g.away_team_abbr} ${g.away_score} / ${g.home_score} ${g.home_team_abbr}`
      if (!items.find(i => i.label === label)) {
        items.push({ type: 'game', id: g.id, label, sub: `${g.series_info || sportLabel(g.sport)} \u00B7 ${formatDate(g.game_date)}`, href: `/game/${g.id}` })
      }
    })

    setResults(items)
    setSearching(false)
  }, [])

  if (!user) {
    return (
      <div>
        <TopLogo />
        <div style={{ padding:'40px 20px', textAlign:'center' }}>
          <div style={{ fontSize:18, color:'var(--ink)', marginBottom:12 }}>Sign in to start logging</div>
          <div style={{ fontSize:13, color:'var(--muted)', marginBottom:20, lineHeight:1.5 }}>Rate games, share stories, track your venues, and build your collection.</div>
          <div onClick={() => router.push('/auth')} style={{ display:'inline-block', padding:'14px 36px', background:'var(--copper)', color:'#fff', fontSize:13, fontFamily:'Arial,sans-serif', fontWeight:600, letterSpacing:1, cursor:'pointer' }}>SIGN IN</div>
        </div>
        <div style={{ height:80 }}></div>
      </div>
    )
  }

  return (
    <div>
      <TopLogo />
      <div style={{ padding:'20px' }}>
        <div style={{ fontSize:20, color:'var(--ink)', marginBottom:4 }}>Log a Game</div>
        <div className="sans" style={{ fontSize:11, color:'var(--dim)', marginBottom:16 }}>Find the game you watched or attended</div>

        <input
          type="text"
          placeholder="Search by team, player, game title..."
          value={search}
          onChange={e => { setSearch(e.target.value); doSearch(e.target.value) }}
          style={{
            width:'100%', padding:'12px 14px', fontSize:14,
            border:'1px solid var(--faint)', background:'var(--card)', color:'var(--ink)',
            fontFamily:'inherit', boxSizing:'border-box',
          }}
        />

        {results.length > 0 && <div style={{ marginTop:8, border:'1px solid var(--faint)', background:'var(--card)' }}>
          {results.map(r => (
            <div key={`${r.type}-${r.id}`} onClick={() => router.push(r.href)} style={{
              padding:'12px 14px', borderBottom:'1px solid var(--faint)', cursor:'pointer'
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {r.type === 'notable' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
                <span style={{ fontSize:14, color:'var(--ink)' }}>{r.label}</span>
              </div>
              <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:3 }}>{r.sub}</div>
            </div>
          ))}
        </div>}

        {search.length >= 2 && results.length === 0 && !searching && (
          <div className="sans" style={{ fontSize:12, color:'var(--dim)', marginTop:16, textAlign:'center' }}>No games found. Try a team name or abbreviation.</div>
        )}
      </div>

      <div style={{ height:80 }}></div>
    </div>
  )
}
