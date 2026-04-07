'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, showScore, savePlaylist } from '@/lib/utils'
import Link from 'next/link'
import SportBadge from '@/components/SportBadge'

function Banner({ w=22, h=32 }) {
  return <svg width={w} height={h} viewBox="0 0 34 50"><path d="M0,0 L34,0 L34,50 L17,43 L0,50 Z" fill="#b5563a"/><path d="M3.5,3.5 L30.5,3.5 L30.5,44 L17,38.5 L3.5,44 Z" fill="#d4a843" opacity="0.85"/><path d="M7,7 L27,7 L27,39.5 L17,34.5 L7,39.5 Z" fill="#b5563a"/></svg>
}

export default function HomePage() {
  const [hero, setHero] = useState(null)
  const [colls, setColls] = useState([])
  const [recent, setRecent] = useState([])
  const [allTimerList, setAllTimerList] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      // FIX #53: Only tier 1 for hero
      const { data: pool } = await supabase.from('notable_games').select('*').eq('tier', 1).not('description', 'is', null).limit(50)
      if (pool?.length > 0) setHero(pool[Math.floor(Math.random() * pool.length)])

      // All tier 1 for "Scroll the All-Timers"
      const { data: atAll } = await supabase.from('notable_games').select('id,title').eq('tier', 1).not('description', 'is', null).order('game_date', { ascending: false })
      setAllTimerList(atAll || [])

      const { data: cd } = await supabase.from('notable_games').select('id,title,game_date,away_team_abbr,home_team_abbr,away_score,home_score,sport,collections')
        .not('collections', 'is', null).eq('tier', 1).order('game_date', { ascending: false }).limit(500)
      if (cd) {
        const m = {}
        cd.forEach(g => { if (Array.isArray(g.collections)) g.collections.forEach(c => {
          if (!m[c]) m[c] = { name: c, games: [] }
          if (m[c].games.length < 3) m[c].games.push(g)
        })})
        Object.values(m).forEach(c => c.games.sort((a,b) => (a.sport==='golf'?1:0)-(b.sport==='golf'?1:0)))
        setColls(Object.values(m).filter(c => c.games.length >= 2).sort((a,b) => b.games.length - a.games.length).slice(0, 6))
      }

      const { data: rg } = await supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,venue,context_blurb,sport,series_info')
        .not('context_blurb', 'is', null).order('game_date', { ascending: false }).limit(6)
      setRecent(rg || [])
      setLoaded(true)
    }
    load()
  }, [])

  if (!loaded) return <div className="loading">Loading...</div>

  return (
    <div>
      <div className="masthead">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:6 }}>
          <Banner /><span className="masthead-title">raftrs</span><Banner />
        </div>
        <div className="masthead-sub">The games you carry with you</div>
      </div>

      {hero && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/>
        <Link href={`/notable/${hero.id}`} className="hero-link" onClick={() => {
          const playlist = allTimerList.map(g => ({ href: `/notable/${g.id}`, title: g.title }))
          const idx = allTimerList.findIndex(g => g.id === hero.id)
          savePlaylist(playlist, idx >= 0 ? idx : 0)
        }}>
          <div className="hero-label"><SportBadge sport={hero.sport}/><span style={{ marginLeft:8 }}>FEATURED ALL-TIMER</span></div>
          <div className="hero-title">{hero.title}</div>
          {showScore(hero) && <div className="hero-score">{showScore(hero)}</div>}
          {hero.sport === 'golf' && hero.home_team_abbr && <div className="hero-score">{hero.home_team_abbr}</div>}
          <div className="game-meta">{formatDate(hero.game_date)}</div>
          {hero.venue && <div className="game-meta">{hero.venue}</div>}
          {hero.description && <div className="hero-blurb">{hero.description}</div>}
        </Link>
        {allTimerList.length > 0 && <div style={{ padding:'0 20px 16px' }}><span className="sans" onClick={() => {
          const playlist = allTimerList.map(g => ({ href: `/notable/${g.id}`, title: g.title }))
          savePlaylist(playlist, 0)
          window.location.href = playlist[0].href
        }} style={{ fontSize:11, color:'var(--copper)', cursor:'pointer' }}>Scroll all {allTimerList.length} All-Timers &rarr;</span></div>}
      </>)}

      <hr className="sec-rule"/><hr className="sec-rule-thin"/>
      <div style={{ padding:'24px 20px', textAlign:'center' }}>
        <div style={{ fontSize:18, color:'var(--ink)', lineHeight:1.4, marginBottom:8 }}>Every game tells a story. What are yours?</div>
        <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6, maxWidth:300, margin:'0 auto 16px' }}>Rate the games that matter. Share the stories behind them. Build your personal collection.</div>
        <Link href="/search" style={{ display:'inline-block', padding:'10px 28px', background:'var(--copper)', color:'#fff', fontSize:12, fontFamily:'Arial,sans-serif', fontWeight:600, letterSpacing:1, textDecoration:'none' }}>FIND A GAME</Link>
      </div>

      {colls.length > 0 && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
        <div className="sec-head">COLLECTIONS</div>
        {colls.map(c => <div key={c.name} style={{ marginBottom:20 }}>
          <Link href={`/collection/${encodeURIComponent(c.name)}`} style={{ fontSize:16, color:'var(--ink)', textDecoration:'none', borderBottom:'1px solid var(--copper)' }}>{c.name}</Link>
          <div style={{ marginTop:8 }}>{c.games.map(g =>
            <Link key={g.id} href={`/notable/${g.id}`} className="game-row" style={{ padding:'6px 0', display:'flex', alignItems:'baseline', gap:8 }}>
              <span className="sans" style={{ fontSize:10, color:'var(--dim)', minWidth:32 }}>{g.game_date?.split('-')[0]}</span>
              <span style={{ fontSize:13, color:'var(--text)' }}>{g.title}</span>
            </Link>
          )}</div>
          <Link href={`/collection/${encodeURIComponent(c.name)}`} className="sans" style={{ fontSize:11, color:'var(--copper)', marginTop:4, display:'inline-block' }}>View all &rarr;</Link>
        </div>)}
      </div></>)}

      {recent.length > 0 && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
        <div className="sec-head">LATEST IN THE ARCHIVE<Link href="/browse" className="sec-link">Browse all &rarr;</Link></div>
        <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:-10, marginBottom:14 }}>Recently added playoff and championship games</div>
        {recent.map(g => <Link key={g.id} href={`/game/${g.id}`} className="game-row" style={{ padding:'10px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}><SportBadge sport={g.sport}/>
              <span style={{ fontSize:14, color:'var(--ink)' }}>{showScore(g) || g.title || `${g.away_team_abbr} @ ${g.home_team_abbr}`}</span>
            </div>
            <span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{formatDate(g.game_date)}</span>
          </div>
          {g.series_info && <div className="sans" style={{ fontSize:10, color:'var(--copper)', marginTop:2 }}>{g.series_info}</div>}
        </Link>)}
      </div></>)}
    </div>
  )
}
