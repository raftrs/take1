'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { formatDate, scoreWithWinner, isPlayoff } from '@/lib/utils'
import TopLogo from '@/components/TopLogo'
import SportBadge from '@/components/SportBadge'
import FounderBadge from '@/components/FounderBadge'

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth()
  const [stats, setStats] = useState({ logged: 0, attended: 0, stories: 0, encounters: 0, venues: 0, avgRating: 0 })
  const [favorites, setFavorites] = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const [teamData, setTeamData] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [tab, setTab] = useState('scorebook')
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 })

  useEffect(() => {
    if (!user) return
    async function loadStats() {
      const { data: ug } = await supabase.from('user_games').select('id,game_id,rating,attended,story,created_at').eq('user_id', user.id).order('created_at', { ascending: false })
      const games = ug || []
      const logged = games.length
      const attended = games.filter(g => g.attended).length
      const stories = games.filter(g => g.story && g.story.trim()).length
      const ratings = games.filter(g => g.rating).map(g => g.rating)
      const avgRating = ratings.length > 0 ? (ratings.reduce((a,b) => a+b, 0) / ratings.length).toFixed(1) : 0

      const { count: venueCount } = await supabase.from('user_venues').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      const { count: encCount } = await supabase.from('encounters').select('id', { count: 'exact', head: true }).eq('user_id', user.id)

      // Follow counts
      const { count: fc } = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id)
      const { count: fgc } = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id)
      setFollowCounts({ followers: fc || 0, following: fgc || 0 })

      // Team data
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
        const ids = games.slice(0, 30).map(g => g.game_id)
        const { data: gd } = await supabase.from('games').select('id,title,home_team_abbr,away_team_abbr,home_score,away_score,game_date,sport,series_info').in('id', ids)
        setRecentLogs(games.slice(0, 30).map(ug => ({ ...ug, game: gd?.find(g => g.id === ug.game_id) })))
      }

      setStats({ logged, attended, stories, encounters: encCount || 0, venues: venueCount || 0, avgRating })

      // Rafters recommendations
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
        <div style={{ fontFamily:'var(--display)', fontSize:28, color:'var(--ink)', letterSpacing:4, marginBottom:8 }}>raftrs</div>
        <div style={{ fontSize:14, color:'var(--muted)', fontStyle:'italic', marginBottom:24 }}>Share the stories you&apos;ll never forget.</div>
        <Link href="/auth" className="sans" style={{ display:'inline-block', padding:'14px 36px', background:'var(--copper)', color:'#fff', fontSize:13, fontWeight:600, letterSpacing:1, textDecoration:'none' }}>SIGN IN / CREATE ACCOUNT</Link>
      </div>
      <div style={{ height:80 }}></div>
    </div>
  )

  const initial = (profile?.display_name || profile?.username || '?')[0].toUpperCase()

  return (
    <div>
      <TopLogo />
      {/* HEADER */}
      <div style={{ padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div className="avatar avatar-lg">{initial}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, color: 'var(--ink)', fontFamily: 'var(--display)', lineHeight: 1.2 }}>
              {profile?.display_name || profile?.username || 'Fan'}
              <FounderBadge number={profile?.member_number}/>
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>@{profile?.username}</div>
            {profile?.city && <div className="mono" style={{ fontSize: 11, color: 'var(--copper)', marginTop: 2 }}>{profile.city}</div>}
            <div className="mono" style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>
              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{followCounts.followers}</span> follower{followCounts.followers !== 1 ? 's' : ''}
              <span style={{ margin: '0 6px', color: 'var(--faint)' }}>&middot;</span>
              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{followCounts.following}</span> following
            </div>
            <div onClick={signOut} className="mono" style={{ fontSize: 10, color: 'var(--dim)', cursor: 'pointer', marginTop: 6 }}>Sign out</div>
          </div>
        </div>

        {/* Favorite teams */}
        {teamData.length > 0 && <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {teamData.map(t => {
            const color = t.primary_color || 'var(--copper)'
            return <Link key={t.id} href={`/team/${t.id}`} style={{ textDecoration: 'none' }}>
              <span className="mono" style={{ fontSize: 9, padding: '3px 8px', background: `${color}12`, color: color, border: `1px solid ${color}`, letterSpacing: 0.5, fontWeight: 700 }}>{t.team_name}</span>
            </Link>
          })}
        </div>}

        {/* RAFTERS BANNERS */}
        <div style={{ marginTop: 16 }}>
          <div className="sec-label" style={{ marginBottom: 6 }}>MY RAFTERS</div>
          <div className="rafters-rod" />
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {[1,2,3,4,5].map(pos => {
              const fav = favorites.find(f => f.position === pos)
              const hasFav = fav?.game
              const href = hasFav ? (fav.notable_game_id ? `/notable/${fav.notable_game_id}` : `/game/${fav.game_id}`) : '/log'
              return (
                <Link key={pos} href={href} style={{ flex: 1, textDecoration: 'none' }}>
                  {hasFav ? (
                    <div className="banner" style={{ background: 'var(--copper)', width: '100%' }}>
                      <div className="banner-abbr" style={{ fontSize: 8, lineHeight: 1.3 }}>{fav.game.title || `${fav.game.away_team_abbr} @ ${fav.game.home_team_abbr}`}</div>
                    </div>
                  ) : (
                    <div className="banner empty" style={{ width: '100%' }}>
                      <div className="banner-slot" style={{ marginTop: 14 }}>+</div>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* STAT BAR */}
      <div className="stat-bar">
        {[
          { v: stats.logged, l: 'Games' },
          { v: stats.stories, l: 'Stories' },
          { v: stats.venues, l: 'Venues', href: '/venues' },
          { v: stats.encounters, l: 'Met' },
        ].map((s, i) => (
          <div key={i} className="stat-box" onClick={() => { if (s.href) window.location.href = s.href }}>
            <div className="stat-val">{s.v}</div>
            <div className="stat-lbl">{s.l}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="prof-tabs">
        {['scorebook', 'stories', 'rafters'].map(t => (
          <button key={t} className={`prof-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'scorebook' ? 'Scorebook' : t === 'stories' ? 'Stories' : 'Rafters'}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {tab === 'scorebook' && (
        <div style={{ padding: '0 20px' }}>
          {recentLogs.length > 0 ? recentLogs.map(log => {
            const g = log.game
            if (!g) return null
            const sc = scoreWithWinner(g)
            const playoff = isPlayoff(g.series_info)
            return (
              <Link key={log.id} href={`/game/${g.id}`} style={{ textDecoration: 'none' }}>
                <div className="book-entry">
                  <div className="book-date">
                    {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace(' ', '\n')}
                  </div>
                  <div className="book-main">
                    {sc ? (
                      <div className="book-score">
                        <span className={sc.away.won ? '' : 'dim'}>{sc.away.abbr} {sc.away.score}</span>
                        {' / '}
                        <span className={sc.home.won ? '' : 'dim'}>{sc.home.abbr} {sc.home.score}</span>
                      </div>
                    ) : (
                      <div className="book-score">{g.title || `${g.away_team_abbr} @ ${g.home_team_abbr}`}</div>
                    )}
                    <div className="book-detail">
                      {formatDate(g.game_date)}
                      {playoff && g.series_info && <> &middot; <span className="playoff">{g.series_info}</span></>}
                      {log.attended && <> &middot; Attended</>}
                    </div>
                    {log.rating && <div className="stars" style={{ marginTop: 4 }}>{[1,2,3,4,5].map(i => <span key={i} className={`s${i <= log.rating ? ' on' : ''}`}>&#9733;</span>)}</div>}
                    {log.story && <div className="book-excerpt">&ldquo;{log.story.slice(0, 90)}{log.story.length > 90 ? '...' : ''}&rdquo;</div>}
                  </div>
                </div>
              </Link>
            )
          }) : <div className="empty">No games logged yet. Find one to get started.</div>}
        </div>
      )}

      {tab === 'stories' && (
        <div style={{ padding: '0 20px' }}>
          {recentLogs.filter(l => l.story).length > 0 ? recentLogs.filter(l => l.story).map(log => {
            const g = log.game
            if (!g) return null
            return (
              <Link key={log.id} href={`/story/${log.id}`} style={{ textDecoration: 'none' }}>
                <div className="book-entry">
                  <div className="book-date">
                    {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace(' ', '\n')}
                  </div>
                  <div className="book-main">
                    <div className="book-score">{g.title || `${g.away_team_abbr} @ ${g.home_team_abbr}`}</div>
                    {log.rating && <div className="stars" style={{ marginTop: 4 }}>{[1,2,3,4,5].map(i => <span key={i} className={`s${i <= log.rating ? ' on' : ''}`}>&#9733;</span>)}</div>}
                    <div className="book-excerpt">&ldquo;{log.story.slice(0, 120)}{log.story.length > 120 ? '...' : ''}&rdquo;</div>
                  </div>
                </div>
              </Link>
            )
          }) : <div className="empty">No stories yet. Rate a game and share what you remember.</div>}
        </div>
      )}

      {tab === 'rafters' && (
        <div style={{ padding: 20 }}>
          {favorites.filter(f => f.game).length > 0 ? (
            favorites.filter(f => f.game).map((fav, i) => (
              <Link key={i} href={fav.notable_game_id ? `/notable/${fav.notable_game_id}` : `/game/${fav.game_id}`} className="game-row" style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>#{fav.position}</span>
                <SportBadge sport={fav.game.sport} />
                <div>
                  <div style={{ fontSize: 14, color: 'var(--ink)' }}>{fav.game.title || `${fav.game.away_team_abbr} @ ${fav.game.home_team_abbr}`}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{formatDate(fav.game.game_date)}</div>
                </div>
              </Link>
            ))
          ) : <div className="empty">Hang your banners. Add games to your Rafters from any game page.</div>}

          {/* Suggestions */}
          {suggestions.length > 0 && (<>
            <hr className="worn-rule" style={{ margin: '16px 0' }} />
            <div className="sec-head">SUGGESTED FOR YOUR RAFTERS</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 12 }}>All-Timers featuring your teams</div>
            {suggestions.map(s => (
              <Link key={s.id} href={`/notable/${s.id}`} className="game-row" style={{ padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="at-badge-sm">&#9733;</span>
                  <SportBadge sport={s.sport} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)' }}>{s.title}</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{formatDate(s.game_date)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </>)}
        </div>
      )}

      <div style={{ height: 80 }}></div>
    </div>
  )
}
