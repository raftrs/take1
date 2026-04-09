'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import TopLogo from '@/components/TopLogo'
import SportBadge from '@/components/SportBadge'
import FounderBadge from '@/components/FounderBadge'

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth()
  const [stats, setStats] = useState({ logged: 0, attended: 0, stories: 0, encounters: 0, venues: 0, avgRating: 0 })
  const [favorites, setFavorites] = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)
  const [teamData, setTeamData] = useState([])
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    if (!user) return
    async function loadStats() {
      // User games
      const { data: ug } = await supabase.from('user_games').select('id,game_id,rating,attended,story,created_at').eq('user_id', user.id).order('created_at', { ascending: false })
      const games = ug || []
      const logged = games.length
      const attended = games.filter(g => g.attended).length
      const stories = games.filter(g => g.story && g.story.trim()).length
      const ratings = games.filter(g => g.rating).map(g => g.rating)
      const avgRating = ratings.length > 0 ? (ratings.reduce((a,b) => a+b, 0) / ratings.length).toFixed(1) : 0

      // Venues from user_venues checklist
      const { count: venueCount } = await supabase.from('user_venues').select('id', { count: 'exact', head: true }).eq('user_id', user.id)

      // Encounters
      const { count: encCount } = await supabase.from('encounters').select('id', { count: 'exact', head: true }).eq('user_id', user.id)

      // Load team data for favorite team chips
      let allTeams = []
      const { data: prof } = await supabase.from('profiles').select('favorite_teams').eq('id', user.id).single()
      if (prof?.favorite_teams?.length) {
        const ids = prof.favorite_teams.filter(t => typeof t === 'number')
        const abbrs = prof.favorite_teams.filter(t => typeof t === 'string')
        if (ids.length) {
          const { data: td } = await supabase.from('teams').select('id,team_abbr,team_name,sport,primary_color').in('id', ids).eq('active', true)
          if (td) allTeams.push(...td)
        }
        if (abbrs.length) {
          const { data: td } = await supabase.from('teams').select('id,team_abbr,team_name,sport,primary_color').in('team_abbr', abbrs).eq('active', true)
          if (td) allTeams.push(...td)
        }
        // Auto-migrate: if any abbreviations found, convert entire array to IDs
        if (abbrs.length > 0 && allTeams.length > 0) {
          const migratedIds = allTeams.map(t => t.id)
          await supabase.from('profiles').update({ favorite_teams: migratedIds }).eq('id', user.id)
        }
      }
      setTeamData(allTeams)

      // Favorites
      const { data: favs } = await supabase.from('favorite_games').select('*').eq('user_id', user.id).order('position')
      if (favs && favs.length > 0) {
        const gIds = favs.filter(f => f.game_id).map(f => f.game_id)
        const nIds = favs.filter(f => f.notable_game_id).map(f => f.notable_game_id)
        const { data: gd } = gIds.length > 0 ? await supabase.from('games').select('id,title,home_team_abbr,away_team_abbr,home_score,away_score,game_date,sport').in('id', gIds) : { data: [] }
        const { data: nd } = nIds.length > 0 ? await supabase.from('notable_games').select('id,title,game_date,sport').in('id', nIds) : { data: [] }
        setFavorites(favs.map(f => {
          const game = gd?.find(g => g.id === f.game_id) || nd?.find(n => n.id === f.notable_game_id)
          return { ...f, game }
        }))
      }

      // Recent logs with game data
      if (games.length > 0) {
        const ids = games.slice(0, 20).map(g => g.game_id)
        const { data: gd } = await supabase.from('games').select('id,title,home_team_abbr,away_team_abbr,home_score,away_score,game_date,sport').in('id', ids)
        setRecentLogs(games.slice(0, 20).map(ug => ({ ...ug, game: gd?.find(g => g.id === ug.game_id) })))
      }

      setStats({ logged, attended, stories, encounters: encCount || 0, venues: venueCount || 0, avgRating })

      // Rafters recommendations based on favorite teams
      if (allTeams.length > 0) {
        const favAbbrs = allTeams.map(t => t.team_abbr)
        const raftedIds = (favs || []).filter(f => f.notable_game_id).map(f => f.notable_game_id)
        const orClauses = favAbbrs.map(a => `home_team_abbr.eq.${a},away_team_abbr.eq.${a}`).join(',')
        const { data: sug } = await supabase.from('notable_games')
          .select('id,title,game_date,sport,tier,home_team_abbr,away_team_abbr')
          .eq('tier', 1).or(orClauses)
          .order('game_date', { ascending: false }).limit(20)
        if (sug) {
          const filtered = sug.filter(s => !raftedIds.includes(s.id)).slice(0, 5)
          setSuggestions(filtered)
        }
      }
    }
    loadStats()
  }, [user])

  if (loading) return <div className="loading">Loading...</div>

  if (!user) return (
    <div>
      <TopLogo />
      <div style={{ padding:'40px 20px', textAlign:'center', borderBottom:'1px solid var(--faint)' }}>
        <div style={{ fontSize:28, color:'var(--ink)', letterSpacing:4, marginBottom:8 }}>raftrs</div>
        <div style={{ fontSize:14, color:'var(--muted)', fontStyle:'italic', marginBottom:24 }}>Share the stories you&apos;ll never forget.</div>
        <Link href="/auth" style={{ display:'inline-block', padding:'14px 36px', background:'var(--copper)', color:'#fff', fontSize:13, fontFamily:'Arial,sans-serif', fontWeight:600, letterSpacing:1, textDecoration:'none' }}>SIGN IN / CREATE ACCOUNT</Link>
      </div>
      <div style={{ height:80 }}></div>
    </div>
  )

  return (
    <div>
      <TopLogo />
      {/* TRADING CARD HEADER */}
      <div style={{ padding:'24px 20px', borderBottom:'2px solid var(--rule)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:22, color:'var(--ink)', lineHeight:1.2 }}>
              {profile?.display_name || profile?.username || 'Fan'}
              <FounderBadge number={profile?.member_number}/>
            </div>
            <div className="sans" style={{ fontSize:11, color:'var(--dim)', marginTop:4 }}>@{profile?.username}</div>
            {profile?.city && <div className="sans" style={{ fontSize:11, color:'var(--copper)', marginTop:4 }}>{profile.city}</div>}
            <div onClick={signOut} className="sans" style={{ fontSize:10, color:'var(--dim)', cursor:'pointer', marginTop:8 }}>Sign out</div>
          </div>
          {profile?.member_number && profile.member_number <= 1000 && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ position:'relative', width:52, height:68 }}>
                {/* Gold border layer */}
                <div style={{
                  position:'absolute', top:0, left:0, width:52, height:68,
                  background:'var(--gold)', clipPath:'polygon(0 0,100% 0,100% 85%,50% 100%,0 85%)',
                }} />
                {/* Copper inner */}
                <div style={{
                  position:'absolute', top:2, left:2, width:48, height:64,
                  background:'var(--copper)', clipPath:'polygon(0 0,100% 0,100% 85%,50% 100%,0 85%)',
                  display:'flex', alignItems:'center', justifyContent:'center', paddingBottom:10
                }}>
                  <div className="sans" style={{ fontSize:18, fontWeight:800, color:'#fff', lineHeight:1 }}>{profile.member_number}</div>
                </div>
              </div>
              <div className="sans" style={{ fontSize:6, letterSpacing:1.5, fontWeight:700, color:'var(--gold)', marginTop:3, textAlign:'center', lineHeight:1.3 }}>FOUNDING<br/>MEMBER</div>
            </div>
          )}
        </div>

        {/* Favorite teams */}
        {teamData.length > 0 && <div style={{ display:'flex', gap:6, marginTop:12, flexWrap:'wrap' }}>
          {teamData.map(t => {
            const color = t.primary_color || 'var(--copper)'
            return <Link key={t.id} href={`/team/${t.id}`} style={{ textDecoration:'none' }}>
              <span className="sans" style={{ fontSize:10, padding:'3px 8px', background:`${color}12`, color:color, border:`1px solid ${color}`, letterSpacing:0.5 }}>{t.team_name}</span>
            </Link>
          })}
        </div>}

        {/* THE FIVE BANNERS */}
        <div style={{ marginTop:16 }}>
          <div className="sans" style={{ fontSize:8, color:'var(--dim)', letterSpacing:2, fontWeight:600, marginBottom:6 }}>MY RAFTERS</div>
          {/* Rod */}
          <div style={{ height:3, background:'linear-gradient(90deg, var(--faint), var(--dim), var(--faint))', borderRadius:2 }}/>
          <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
            {[1,2,3,4,5].map(pos => {
              const fav = favorites.find(f => f.position === pos)
              const hasFav = fav?.game
              const href = hasFav ? (fav.notable_game_id ? `/notable/${fav.notable_game_id}` : `/game/${fav.game_id}`) : '/log'
              return (
                <div key={pos} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <Link href={href} style={{ textDecoration:'none', width:'100%' }}>
                    {hasFav ? (
                      <div style={{
                        width:'100%', minHeight:72, padding:'10px 4px 16px',
                        background:'var(--copper)', color:'#fff',
                        clipPath:'polygon(0 0,100% 0,100% 85%,50% 100%,0 85%)',
                        display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center',
                      }}>
                        <div style={{ fontSize:8, lineHeight:1.4, fontWeight:600, padding:'0 2px', letterSpacing:0.3 }}>{fav.game.title || `${fav.game.away_team_abbr} @ ${fav.game.home_team_abbr}`}</div>
                      </div>
                    ) : (
                      <div style={{
                        width:'100%', minHeight:72, padding:'10px 4px 16px',
                        background:'var(--surface)',
                        clipPath:'polygon(0 0,100% 0,100% 85%,50% 100%,0 85%)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        border:'none', position:'relative',
                      }}>
                        <div style={{ position:'absolute', inset:0, border:'1.5px dashed var(--faint)', clipPath:'polygon(0 0,100% 0,100% 85%,50% 100%,0 85%)' }}/>
                        <div className="sans" style={{ fontSize:18, color:'var(--faint)' }}>+</div>
                      </div>
                    )}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* STAT GRID */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--faint)' }}>
        {[
          { v: stats.logged, l: 'LOGGED', href: null, action: () => setShowLogs(true) },
          { v: stats.attended, l: 'ATTENDED', href: null, action: () => setShowLogs(true) },
          { v: stats.venues, l: 'VENUES', href: '/venues' },
          { v: stats.stories, l: 'STORIES', href: null, action: () => setShowLogs(true) },
          { v: stats.encounters, l: 'MET', href: null },
        ].map((s, i) => (
          <div key={i} onClick={() => { if (s.href) window.location.href = s.href; else if (s.action) s.action() }} style={{ flex:1, textAlign:'center', padding:'14px 4px', borderRight: i < 4 ? '1px solid var(--faint)' : 'none', cursor: (s.href || s.action) ? 'pointer' : 'default' }}>
            <div style={{ fontSize:20, color:'var(--ink)' }}>{s.v}</div>
            <div className="sans" style={{ fontSize:7, color:'var(--dim)', letterSpacing:1, fontWeight:600, marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* AVG RATING */}
      {stats.avgRating > 0 && <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--faint)', display:'flex', alignItems:'center', gap:8 }}>
        <div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:2, fontWeight:600 }}>AVG RATING</div>
        <div style={{ fontSize:16, color:'var(--gold)' }}>{'★'.repeat(Math.round(stats.avgRating))}</div>
        <div className="sans" style={{ fontSize:12, color:'var(--ink)' }}>{stats.avgRating}</div>
      </div>}

      {/* RECENT ACTIVITY */}
      {recentLogs.length > 0 && (<>
        <div style={{ padding:'16px 20px 0' }}>
          <div className="sec-head" onClick={() => setShowLogs(!showLogs)} style={{ cursor:'pointer' }}>
            RECENT ACTIVITY
            <span className="sans" style={{ fontSize:10, color:'var(--copper)', marginLeft:8 }}>{showLogs ? 'Hide' : `Show all ${stats.logged}`}</span>
          </div>
        </div>
        {(showLogs ? recentLogs : recentLogs.slice(0, 5)).map(log => {
          const g = log.game
          if (!g) return null
          return <Link key={log.id} href={`/game/${g.id}`} style={{ display:'block', padding:'10px 20px', borderBottom:'1px solid var(--faint)', textDecoration:'none' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontSize:13, color:'var(--ink)' }}>{g.title || `${g.away_team_abbr} ${g.away_score} / ${g.home_score} ${g.home_team_abbr}`}</span>
              <span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{log.attended ? 'Attended' : 'Watched'}</span>
            </div>
            {log.rating && <div style={{ fontSize:12, color:'var(--gold)', marginTop:2 }}>{'★'.repeat(log.rating)}</div>}
            {log.story && <div style={{ fontSize:12, color:'var(--muted)', marginTop:4, fontStyle:'italic' }}>{log.story.slice(0, 80)}{log.story.length > 80 ? '...' : ''}</div>}
          </Link>
        })}
      </>)}

      {/* RAFTERS RECOMMENDATIONS */}
      {suggestions.length > 0 && (<>
        <hr className="sec-rule"/><hr className="sec-rule-thin"/>
        <div style={{ padding:20 }}>
          <div className="sec-head">SUGGESTED FOR YOUR RAFTERS</div>
          <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginBottom:12 }}>All-Timers featuring your teams</div>
          {suggestions.map(s => (
            <Link key={s.id} href={`/notable/${s.id}`} className="game-row" style={{ padding:'8px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span className="at-badge-sm">&#9733;</span>
                <SportBadge sport={s.sport}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:'var(--ink)' }}>{s.title}</div>
                  <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{formatDate(s.game_date)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </>)}

      <div style={{ height:80 }}></div>
    </div>
  )
}
