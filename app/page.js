'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, showScore, savePlaylist, golfMajorDisplay } from '@/lib/utils'
import Link from 'next/link'
import SportBadge from '@/components/SportBadge'
import HighFive from '@/components/HighFive'
import FounderBadge from '@/components/FounderBadge'

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
  const [mode, setMode] = useState('featured')
  const [feed, setFeed] = useState([])

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

      // Feed: recent stories from all users
      const { data: st } = await supabase.from('user_games')
        .select('id,user_id,story,rating,attended,created_at,game_id')
        .not('story', 'is', null).neq('story', '')
        .order('created_at', { ascending: false }).limit(20)
      if (st?.length) {
        const uids = [...new Set(st.map(s => s.user_id))]
        const { data: profiles } = await supabase.from('profiles').select('id,username,display_name,member_number').in('id', uids)
        const pMap = {}; if (profiles) profiles.forEach(p => { pMap[p.id] = p })
        const gids = [...new Set(st.map(s => s.game_id).filter(Boolean))]
        const { data: games } = await supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,sport,title').in('id', gids)
        const gMap = {}; if (games) games.forEach(g => { gMap[g.id] = g })
        const { data: notables } = await supabase.from('notable_games').select('id,title,game_id,sport,game_date').in('game_id', gids)
        const nMap = {}; if (notables) notables.forEach(n => { if (n.game_id) nMap[n.game_id] = n })
        setFeed(st.map(s => ({ ...s, profile: pMap[s.user_id], game: gMap[s.game_id], notable: nMap[s.game_id] })))
      }

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

      {/* Mode toggle */}
      <div style={{ display:'flex', borderBottom:'2px solid var(--rule)' }}>
        {[{ k:'featured', l:'Featured' },{ k:'feed', l:'The Stands' }].map(m => (
          <div key={m.k} onClick={() => setMode(m.k)} style={{
            flex:1, textAlign:'center', padding:'10px 0', cursor:'pointer',
            borderBottom: mode === m.k ? '2px solid var(--copper)' : '2px solid transparent',
            marginBottom:-2,
          }}>
            <span className="sans" style={{ fontSize:11, fontWeight:700, letterSpacing:1, color: mode === m.k ? 'var(--copper)' : 'var(--dim)' }}>{m.l}</span>
          </div>
        ))}
      </div>

      {mode === 'feed' ? (<>
        {/* MY FEED */}
        {feed.length > 0 ? feed.map(s => {
          const p = s.profile
          const g = s.game
          const n = s.notable
          const gameTitle = n?.title || g?.title || (g ? `${g.away_team_abbr} ${g.away_score} / ${g.home_score} ${g.home_team_abbr}` : 'A game')
          const gameHref = n ? `/notable/${n.id}` : `/game/${s.game_id}`
          const gameDate = n?.game_date || g?.game_date
          const gameSport = n?.sport || g?.sport
          return (
            <Link key={s.id} href={`/story/${s.id}`} style={{ display:'block', padding:'16px 20px', borderBottom:'1px solid var(--faint)', textDecoration:'none' }}>
              <div style={{ display:'flex', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:13, color:'var(--copper)', fontWeight:600 }}>{p?.display_name || p?.username || 'A fan'}</span>
                <FounderBadge number={p?.member_number}/>
                {s.rating && <span style={{ fontSize:12, color:'var(--gold)', marginLeft:8 }}>{'★'.repeat(s.rating)}</span>}
                {s.attended && <span className="sans" style={{ fontSize:8, color:'var(--copper)', fontWeight:700, letterSpacing:0.5, marginLeft:8 }}>WAS THERE</span>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                {gameSport && <SportBadge sport={gameSport}/>}
                <span style={{ fontSize:15, color:'var(--ink)', fontWeight:600 }}>{gameTitle}</span>
              </div>
              <div style={{ fontSize:14, color:'var(--muted)', lineHeight:1.7, fontStyle:'italic' }}>
                {s.story.length > 140 ? s.story.slice(0, 140) + '...' : s.story}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:8 }} onClick={e => e.preventDefault()}>
                <HighFive userGameId={s.id}/>
                <span className="sans" style={{ fontSize:10, color:'var(--dim)', marginLeft:'auto' }}>{new Date(s.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>
              </div>
            </Link>
          )
        }) : (
          <div style={{ padding:'40px 20px', textAlign:'center' }}>
            <div style={{ fontSize:16, color:'var(--muted)', marginBottom:8 }}>No stories yet</div>
            <div className="sans" style={{ fontSize:12, color:'var(--dim)' }}>Stories from the community will show up here.</div>
          </div>
        )}
      </>) : (<>

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
        <Link href="/log" style={{ display:'inline-block', padding:'10px 28px', background:'var(--copper)', color:'#fff', fontSize:12, fontFamily:"'Libre Franklin',sans-serif", fontWeight:600, letterSpacing:1, textDecoration:'none' }}>FIND A GAME</Link>
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
      </>)}
    </div>
  )
}
