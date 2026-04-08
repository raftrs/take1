'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, showScore, savePlaylist, golfMajorDisplay } from '@/lib/utils'
import Link from 'next/link'
import SportBadge from '@/components/SportBadge'

function Banner({ w=22, h=32 }) {
  return <svg width={w} height={h} viewBox="0 0 34 50"><path d="M0,0 L34,0 L34,50 L17,43 L0,50 Z" fill="#b5563a"/><path d="M3.5,3.5 L30.5,3.5 L30.5,44 L17,38.5 L3.5,44 Z" fill="#d4a843" opacity="0.85"/><path d="M7,7 L27,7 L27,39.5 L17,34.5 L7,39.5 Z" fill="#b5563a"/></svg>
}

export default function HomePage() {
  const [hero, setHero] = useState(null)
  const [heroType, setHeroType] = useState('random')
  const [colls, setColls] = useState([])
  const [recent, setRecent] = useState([])
  const [allTimerSample, setAllTimerSample] = useState([])
  const [allTimerTotal, setAllTimerTotal] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      // All tier 1 with descriptions
      const { data: pool } = await supabase.from('notable_games').select('*')
        .eq('tier', 1).not('description', 'is', null).limit(300)

      if (pool?.length) {
        // On This Day: check if any game matches today's month-day
        const now = new Date()
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const dd = String(now.getDate()).padStart(2, '0')
        const todaySuffix = `-${mm}-${dd}`
        const todayGames = pool.filter(g => g.game_date?.endsWith(todaySuffix))

        if (todayGames.length > 0) {
          setHero(todayGames[Math.floor(Math.random() * todayGames.length)])
          setHeroType('today')
        } else {
          setHero(pool[Math.floor(Math.random() * pool.length)])
          setHeroType('random')
        }

        // Random sample of 10 for the list
        const shuffled = [...pool].sort(() => Math.random() - 0.5)
        setAllTimerSample(shuffled.slice(0, 10))
        setAllTimerTotal(pool.length)
      }

      // Collections: only 4
      const { data: cd } = await supabase.from('notable_games')
        .select('id,title,game_date,away_team_abbr,home_team_abbr,away_score,home_score,sport,collections')
        .not('collections', 'is', null).eq('tier', 1).order('game_date', { ascending: false }).limit(500)
      if (cd) {
        const m = {}
        cd.forEach(g => { if (Array.isArray(g.collections)) g.collections.forEach(c => {
          if (!m[c]) m[c] = { name: c, games: [] }
          if (m[c].games.length < 3) m[c].games.push(g)
        })})
        const skip = new Set(['Game 7s', 'Super Bowls', 'Greatest Playoff Games', 'Greatest Super Bowls', 'Greatest Majors'])
        setColls(Object.values(m).filter(c => c.games.length >= 2 && !skip.has(c.name)).sort((a,b) => b.games.length - a.games.length).slice(0, 4))
      }

      const { data: rg } = await supabase.from('games')
        .select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,venue,context_blurb,sport,series_info')
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

      {/* HERO */}
      {hero && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/>
        <Link href={`/notable/${hero.id}`} className="hero-link">
          <div className="hero-label">
            <SportBadge sport={hero.sport}/>
            <span style={{ marginLeft:8 }}>{heroType === 'today' ? 'ON THIS DAY' : 'FEATURED ALL-TIMER'}</span>
          </div>
          <div className="hero-title">{hero.title}</div>
          {showScore(hero) && <div className="hero-score">{showScore(hero)}</div>}
          {hero.sport === 'golf' && <div className="hero-score">{golfMajorDisplay(hero)}</div>}
          <div className="game-meta">{formatDate(hero.game_date)}</div>
          {hero.venue && <div className="game-meta">{hero.venue}</div>}
          {hero.description && <div className="hero-blurb">{hero.description}</div>}
        </Link>
      </>)}

      {/* FIND A GAME */}
      <hr className="sec-rule"/><hr className="sec-rule-thin"/>
      <div style={{ padding:'24px 20px', textAlign:'center' }}>
        <div style={{ fontSize:18, color:'var(--ink)', lineHeight:1.4, marginBottom:8 }}>Every game has a story. What are yours?</div>
        <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6, maxWidth:300, margin:'0 auto 16px' }}>Rate the games that matter. Share the stories behind them. Build your personal collection.</div>
        <Link href="/log" style={{ display:'inline-block', padding:'10px 28px', background:'var(--copper)', color:'#fff', fontSize:12, fontFamily:'Arial,sans-serif', fontWeight:600, letterSpacing:1, textDecoration:'none' }}>FIND A GAME</Link>
      </div>

      {/* ALL-TIMERS SAMPLE */}
      {allTimerSample.length > 0 && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/>
        <div style={{ padding:20 }}>
          <div className="sec-head">ALL-TIMERS</div>
          {allTimerSample.map((g, idx) => <Link key={g.id} href={`/notable/${g.id}`} className="game-row" style={{ padding:'8px 0', display:'flex', alignItems:'center', gap:10 }}>
            <SportBadge sport={g.sport}/>
            <div>
              <div style={{ fontSize:14, color:'var(--ink)' }}>{g.title}</div>
              <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{formatDate(g.game_date)}</div>
            </div>
          </Link>)}
          <div style={{ textAlign:'center', marginTop:12 }}>
            <Link href="/vault" className="sans" style={{ fontSize:12, color:'var(--copper)', fontWeight:600, letterSpacing:0.5 }}>See all {allTimerTotal} in The Vault &rarr;</Link>
          </div>
        </div>
      </>)}

      {/* COLLECTIONS (3-4) */}
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
        <div style={{ textAlign:'center', marginTop:8 }}>
          <Link href="/vault" className="sans" style={{ fontSize:12, color:'var(--copper)', fontWeight:600, letterSpacing:0.5 }}>All Collections in The Vault &rarr;</Link>
        </div>
      </div></>)}

      {/* LATEST IN THE ARCHIVE */}
      {recent.length > 0 && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
        <div className="sec-head">LATEST IN THE ARCHIVE<Link href="/browse" className="sec-link">Browse all &rarr;</Link></div>
        <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginBottom:14 }}>Recently added playoff and championship games</div>
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
