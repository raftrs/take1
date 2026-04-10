'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, showScore, savePlaylist, golfMajorDisplay } from '@/lib/utils'
import Link from 'next/link'
import SportBadge from '@/components/SportBadge'
import HighFive from '@/components/HighFive'
import FounderBadge from '@/components/FounderBadge'
import StoryCard from '@/components/StoryCard'
import FollowButton from '@/components/FollowButton'
import { useAuth } from '@/lib/auth'

function Banner({ w=22, h=32 }) {
  return <svg width={w} height={h} viewBox="0 0 34 50"><path d="M0,0 L34,0 L34,50 L17,43 L0,50 Z" fill="#b5563a"/><path d="M3.5,3.5 L30.5,3.5 L30.5,44 L17,38.5 L3.5,44 Z" fill="#d4a843" opacity="0.85"/><path d="M7,7 L27,7 L27,39.5 L17,34.5 L7,39.5 Z" fill="#b5563a"/></svg>
}

export default function HomePage() {
  const { user, profile } = useAuth()
  const [hero, setHero] = useState(null)
  const [heroType, setHeroType] = useState('random')
  const [colls, setColls] = useState([])
  const [recent, setRecent] = useState([])
  const [allTimerSample, setAllTimerSample] = useState([])
  const [allTimerTotal, setAllTimerTotal] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [mode, setMode] = useState('featured')
  const [feed, setFeed] = useState([])
  const [cityMembers, setCityMembers] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState([])

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
        const { data: games } = await supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,sport,title,series_info').in('id', gids)
        const gMap = {}; if (games) games.forEach(g => { gMap[g.id] = g })
        const { data: notables } = await supabase.from('notable_games').select('id,title,game_id,sport,game_date').in('game_id', gids)
        const nMap = {}; if (notables) notables.forEach(n => { if (n.game_id) nMap[n.game_id] = n })
        setFeed(st.map(s => ({ ...s, profile: pMap[s.user_id], game: gMap[s.game_id], notable: nMap[s.game_id] })))
      }

      setLoaded(true)
    }
    load()
  }, [])

  // Social discovery - load when profile is available
  useEffect(() => {
    if (!profile) return
    async function loadSocial() {
      if (profile.city) {
        const { data: cm } = await supabase.from('profiles')
          .select('id,username,display_name,city,member_number')
          .ilike('city', `%${profile.city}%`).limit(10)
        if (cm) setCityMembers(cm.filter(m => m.id !== user?.id))
      }
      if (profile.favorite_teams?.length) {
        const { data: allP } = await supabase.from('profiles')
          .select('id,username,display_name,city,favorite_teams,member_number')
          .not('favorite_teams', 'is', null).limit(50)
        if (allP) {
          const myTeams = profile.favorite_teams
          setTeamMembers(allP.filter(p => p.id !== user?.id && Array.isArray(p.favorite_teams) && p.favorite_teams.some(t => myTeams.includes(t))).slice(0, 10))
        }
      }
    }
    loadSocial()
  }, [profile, user])

  // User search
  useEffect(() => {
    if (userSearch.length < 2) { setUserResults([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles')
        .select('id,username,display_name,city,member_number')
        .or(`display_name.ilike.%${userSearch}%,username.ilike.%${userSearch}%`)
        .limit(8)
      setUserResults((data || []).filter(p => p.id !== user?.id))
    }, 200)
    return () => clearTimeout(t)
  }, [userSearch, user])

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
      <div className="feed-nav">
        {[{ k:'featured', l:'Featured' },{ k:'feed', l:'The Stands' }].map(m => (
          <button key={m.k} onClick={() => setMode(m.k)} className={`feed-nav-btn${mode === m.k ? ' active' : ''}`}>
            {m.l}
          </button>
        ))}
      </div>

      {mode === 'feed' ? (<>
        {feed.length > 0 ? feed.map(s => (
          <StoryCard key={s.id} s={s} currentUserId={user?.id} onDelete={(id) => setFeed(prev => prev.filter(x => x.id !== id))} />
        )) : (
          <div className="empty">
            <div style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 8 }}>No stories yet</div>
            <div style={{ fontSize: 12, color: 'var(--dim)', fontFamily: 'var(--ui)' }}>Stories from the community will show up here.</div>
          </div>
        )}

        {/* Find Fans */}
        <hr className="sec-rule" />
        <div style={{ padding: 24 }}>
          <div className="sec-head">Find Fans</div>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search by name or username..."
              className="search-input"
              style={{ width: '100%' }}
            />
            {userResults.length > 0 && (
              <div className="ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>
                {userResults.map(p => {
                  const pi = (p.display_name || p.username || '?')[0].toUpperCase()
                  return (
                    <Link key={p.id} href={`/user/${p.username}`} onClick={() => { setUserSearch(''); setUserResults([]) }}
                      className="ac-item" style={{ textDecoration: 'none' }}>
                      <div className="avatar avatar-sm">{pi}</div>
                      <div style={{ flex: 1 }}>
                        <div className="author-name" style={{ fontSize: 13 }}>{p.display_name || p.username}<FounderBadge number={p.member_number} /></div>
                        {p.city && <div style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--dim)' }}>{p.city}</div>}
                      </div>
                      <FollowButton targetUserId={p.id} />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Fans in Your Area */}
          {cityMembers.length > 0 && (<>
            <div style={{ fontFamily: 'var(--ui)', fontSize: 10, fontWeight: 600, letterSpacing: 0.8, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>Fans in {profile?.city || 'Your Area'}</div>
            {cityMembers.map(m => {
              const mi = (m.display_name || m.username || '?')[0].toUpperCase()
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--rule-light)' }}>
                  <Link href={`/user/${m.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, textDecoration: 'none' }}>
                    <div className="avatar avatar-sm">{mi}</div>
                    <div>
                      <span className="author-name" style={{ fontSize: 13 }}>{m.display_name || m.username}</span>
                      <FounderBadge number={m.member_number} />
                      {m.city && <div style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--dim)' }}>{m.city}</div>}
                    </div>
                  </Link>
                  <FollowButton targetUserId={m.id} />
                </div>
              )
            })}
          </>)}

          {/* Fans Who Share Your Teams */}
          {teamMembers.length > 0 && (<>
            <div style={{ fontFamily: 'var(--ui)', fontSize: 10, fontWeight: 600, letterSpacing: 0.8, color: 'var(--muted)', textTransform: 'uppercase', marginTop: 24, marginBottom: 12 }}>Fans Who Share Your Teams</div>
            {teamMembers.map(m => {
              const mi = (m.display_name || m.username || '?')[0].toUpperCase()
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--rule-light)' }}>
                  <Link href={`/user/${m.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, textDecoration: 'none' }}>
                    <div className="avatar avatar-sm">{mi}</div>
                    <div>
                      <span className="author-name" style={{ fontSize: 13 }}>{m.display_name || m.username}</span>
                      <FounderBadge number={m.member_number} />
                      {m.city && <div style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--dim)' }}>{m.city}</div>}
                    </div>
                  </Link>
                  <FollowButton targetUserId={m.id} />
                </div>
              )
            })}
          </>)}
        </div>
      </>) : (<>

      {/* HERO */}
      {hero && (<><hr className="sec-rule"/>
        <Link href={`/notable/${hero.id}`} className="hero-link">
          <div className="hero-label">
            <SportBadge sport={hero.sport}/>
            <span style={{ marginLeft:8 }}>{heroType === 'today' ? 'ON THIS DAY' : 'FEATURED ALL-TIMER'}</span>
          </div>
          <div className="hero-title">{hero.title}</div>
          {showScore(hero) && <div className="hero-score">{showScore(hero)}</div>}
          <div className="game-meta">{formatDate(hero.game_date)}</div>
          {hero.venue && <div className="game-meta">{hero.venue}</div>}
          {hero.description && <div className="hero-blurb">{hero.description}</div>}
        </Link>
      </>)}

      {/* FIND A GAME */}
      <hr className="sec-rule"/>
      <div style={{ padding:'24px 20px', textAlign:'center' }}>
        <div style={{ fontSize:18, color:'var(--ink)', lineHeight:1.4, marginBottom:8 }}>Every game has a story. What are yours?</div>
        <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6, maxWidth:300, margin:'0 auto 16px' }}>Rate the games that matter. Share the stories behind them. Build your personal collection.</div>
        <Link href="/log" style={{ display:'inline-block', padding:'10px 28px', background:'var(--copper)', color:'#fff', fontSize:12, fontFamily:'var(--ui)', fontWeight:600, letterSpacing:1, textDecoration:'none' }}>FIND A GAME</Link>
      </div>

      {/* ALL-TIMERS CAROUSEL */}
      {allTimerSample.length > 0 && (<><hr className="sec-rule"/>
        <div style={{ padding:'20px 0 20px 20px' }}>
          <div className="sec-head" style={{ paddingRight:20 }}>ALL-TIMERS <Link href="/vault" style={{ fontFamily:'var(--ui)', fontSize:11, color:'var(--amber)', fontWeight:600, textDecoration:'none', letterSpacing:0 }}>See all &rarr;</Link></div>
          <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:8, paddingRight:20, WebkitOverflowScrolling:'touch', scrollbarWidth:'none' }}>
            <style>{`.at-carousel::-webkit-scrollbar{display:none}`}</style>
            {allTimerSample.map(g => (
              <Link key={g.id} href={`/notable/${g.id}`} style={{ flexShrink:0, width:220, padding:'16px 14px', background:'var(--surface)', border:'1px solid var(--faint)', borderTop:'3px solid var(--amber)', textDecoration:'none', display:'block' }}>
                <div style={{ marginBottom:8 }}><SportBadge sport={g.sport}/></div>
                <div style={{ fontFamily:'var(--body)', fontSize:15, color:'var(--ink)', lineHeight:1.3, marginBottom:6 }}>{g.title}</div>
                {g.description && <div style={{ fontFamily:'var(--ui)', fontSize:11, color:'var(--muted)', lineHeight:1.5, marginBottom:8, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{g.description}</div>}
                <div style={{ fontFamily:'var(--ui)', fontSize:10, color:'var(--dim)' }}>{formatDate(g.game_date)}</div>
              </Link>
            ))}
          </div>
        </div>
      </>)}

      {/* COLLECTIONS (3-4) */}
      {colls.length > 0 && (<><hr className="sec-rule"/><div style={{ padding:20 }}>
        <div className="sec-head">COLLECTIONS</div>
        {colls.map(c => <div key={c.name} style={{ marginBottom:20 }}>
          <Link href={`/collection/${encodeURIComponent(c.name)}`} style={{ fontSize:16, color:'var(--ink)', textDecoration:'none', borderBottom:'1px solid var(--copper)' }}>{c.name}</Link>
          <div style={{ marginTop:8 }}>{c.games.map(g =>
            <Link key={g.id} href={`/notable/${g.id}`} className="game-row" style={{ padding:'6px 0', display:'flex', alignItems:'baseline', gap:8 }}>
              <span style={{ fontFamily:"var(--ui)", fontSize:10, color:'var(--dim)', minWidth:32 }}>{g.game_date?.split('-')[0]}</span>
              <span style={{ fontSize:13, color:'var(--text)' }}>{g.title}</span>
            </Link>
          )}</div>
          <Link href={`/collection/${encodeURIComponent(c.name)}`} style={{ fontFamily:"var(--ui)", fontSize:11, color:'var(--copper)', marginTop:4, display:'inline-block' }}>View all &rarr;</Link>
        </div>)}
        <div style={{ textAlign:'center', marginTop:8 }}>
          <Link href="/vault" style={{ fontFamily:"var(--ui)", fontSize:12, color:'var(--copper)', fontWeight:600, letterSpacing:0.5 }}>All Collections in The Vault &rarr;</Link>
        </div>
      </div></>)}

      {/* LATEST IN THE ARCHIVE */}
      {recent.length > 0 && (<><hr className="sec-rule"/><div style={{ padding:20 }}>
        <div className="sec-head">LATEST IN THE ARCHIVE<Link href="/browse" className="sec-link">Browse all &rarr;</Link></div>
        <div style={{ fontFamily:"var(--ui)", fontSize:10, color:'var(--dim)', marginBottom:14 }}>Recently added playoff and championship games</div>
        {recent.map(g => <Link key={g.id} href={`/game/${g.id}`} className="game-row" style={{ padding:'10px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}><SportBadge sport={g.sport}/>
              <span style={{ fontSize:14, color:'var(--ink)' }}>{showScore(g) || g.title || `${g.away_team_abbr} @ ${g.home_team_abbr}`}</span>
            </div>
            <span style={{ fontFamily:"var(--ui)", fontSize:10, color:'var(--dim)' }}>{formatDate(g.game_date)}</span>
          </div>
          {g.series_info && <div style={{ fontFamily:"var(--ui)", fontSize:10, color:'var(--copper)', marginTop:2 }}>{g.series_info}</div>}
        </Link>)}
      </div></>)}
      </>)}
    </div>
  )
}
