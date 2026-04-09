'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate, scoreWithWinner, isPlayoff } from '@/lib/utils'
import BackButton from '@/components/BackButton'
import TopLogo from '@/components/TopLogo'
import SportBadge from '@/components/SportBadge'
import FollowButton from '@/components/FollowButton'
import FounderBadge from '@/components/FounderBadge'
import HighFive from '@/components/HighFive'

export default function UserProfilePage() {
  const { username } = useParams()
  const [prof, setProf] = useState(null)
  const [stats, setStats] = useState({ logged: 0, attended: 0, stories: 0, venues: 0 })
  const [stories, setStories] = useState([])
  const [favorites, setFavorites] = useState([])
  const [teamData, setTeamData] = useState([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [recentLogs, setRecentLogs] = useState([])
  const [tab, setTab] = useState('scorebook')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from('profiles')
        .select('*').eq('username', username).single()
      if (!p) { setLoading(false); return }
      setProf(p)

      const { data: ug } = await supabase.from('user_games').select('id,game_id,rating,attended,story,created_at')
        .eq('user_id', p.id).order('created_at', { ascending: false })
      const games = ug || []
      const logged = games.length
      const attended = games.filter(g => g.attended).length
      const storyCount = games.filter(g => g.story && g.story.trim()).length
      const { count: venueCount } = await supabase.from('user_venues')
        .select('id', { count: 'exact', head: true }).eq('user_id', p.id)
      setStats({ logged, attended, stories: storyCount, venues: venueCount || 0 })

      const { count: fc } = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', p.id)
      setFollowerCount(fc || 0)
      const { count: fgc } = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', p.id)
      setFollowingCount(fgc || 0)

      // Recent logs with game data for scorebook
      if (games.length > 0) {
        const ids = games.slice(0, 30).map(g => g.game_id).filter(Boolean)
        const { data: gd } = await supabase.from('games').select('id,title,home_team_abbr,away_team_abbr,home_score,away_score,game_date,sport,series_info').in('id', ids)
        const { data: nd } = await supabase.from('notable_games').select('id,title,game_id,sport,game_date').in('game_id', ids)
        const gMap = {}; if (gd) gd.forEach(g => { gMap[g.id] = g })
        const nMap = {}; if (nd) nd.forEach(n => { if (n.game_id) nMap[n.game_id] = n })
        setRecentLogs(games.slice(0, 30).map(ug => ({ ...ug, game: gMap[ug.game_id], notable: nMap[ug.game_id] })))
        setStories(games.filter(g => g.story && g.story.trim()).slice(0, 20).map(ug => ({ ...ug, game: gMap[ug.game_id], notable: nMap[ug.game_id] })))
      }

      // Favorites
      const { data: favs } = await supabase.from('favorite_games').select('*').eq('user_id', p.id).order('position')
      if (favs?.length) {
        const gIds = favs.filter(f => f.game_id).map(f => f.game_id)
        const nIds = favs.filter(f => f.notable_game_id).map(f => f.notable_game_id)
        const { data: gd } = gIds.length ? await supabase.from('games').select('id,title,home_team_abbr,away_team_abbr,game_date,sport').in('id', gIds) : { data: [] }
        const { data: nd } = nIds.length ? await supabase.from('notable_games').select('id,title,game_date,sport').in('id', nIds) : { data: [] }
        setFavorites(favs.map(f => {
          const game = gd?.find(g => g.id === f.game_id) || nd?.find(n => n.id === f.notable_game_id)
          return { ...f, game }
        }))
      }

      // Team data
      if (p.favorite_teams?.length) {
        const ids = p.favorite_teams.filter(t => typeof t === 'number')
        const abbrs = p.favorite_teams.filter(t => typeof t === 'string')
        let allTeams = []
        if (ids.length) { const { data: td } = await supabase.from('teams').select('id,team_abbr,team_name,primary_color').in('id', ids); if (td) allTeams.push(...td) }
        if (abbrs.length) { const { data: td } = await supabase.from('teams').select('id,team_abbr,team_name,primary_color').in('team_abbr', abbrs); if (td) allTeams.push(...td) }
        setTeamData(allTeams)
      }
      setLoading(false)
    }
    load()
  }, [username])

  if (loading) return <div className="loading">Loading...</div>
  if (!prof) return <div className="empty">User not found</div>

  const initial = (prof.display_name || prof.username || '?')[0].toUpperCase()

  return (
    <div>
      <TopLogo />
      <BackButton />

      {/* Header */}
      <div style={{ padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div className="avatar avatar-lg">{initial}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, color: 'var(--ink)', fontFamily: 'var(--display)', lineHeight: 1.2 }}>
              {prof.display_name || prof.username}
              <FounderBadge number={prof.member_number}/>
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>@{prof.username}</div>
            {prof.city && <div className="mono" style={{ fontSize: 11, color: 'var(--copper)', marginTop: 2 }}>{prof.city}</div>}
            <div className="mono" style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>
              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{followerCount}</span> follower{followerCount !== 1 ? 's' : ''}
              <span style={{ margin: '0 6px', color: 'var(--faint)' }}>&middot;</span>
              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{followingCount}</span> following
            </div>
          </div>
          <FollowButton targetUserId={prof.id} />
        </div>

        {/* Teams */}
        {teamData.length > 0 && <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {teamData.map(t => (
            <Link key={t.id} href={`/team/${t.id}`} style={{ textDecoration: 'none' }}>
              <span className="mono" style={{ fontSize: 9, padding: '3px 8px', background: `${t.primary_color || 'var(--copper)'}12`, color: t.primary_color || 'var(--copper)', border: `1px solid ${t.primary_color || 'var(--copper)'}`, letterSpacing: 0.5, fontWeight: 700 }}>{t.team_name}</span>
            </Link>
          ))}
        </div>}

        {/* Rafters */}
        {favorites.some(f => f.game) && (<div style={{ marginTop: 16 }}>
          <div className="sec-label" style={{ marginBottom: 6 }}>THEIR RAFTERS</div>
          <div className="rafters-rod" />
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {[1,2,3,4,5].map(pos => {
              const fav = favorites.find(f => f.position === pos)
              const hasFav = fav?.game
              return (
                <div key={pos} style={{ flex: 1 }}>
                  {hasFav ? (
                    <Link href={fav.notable_game_id ? `/notable/${fav.notable_game_id}` : `/game/${fav.game_id}`} style={{ textDecoration: 'none' }}>
                      <div className="banner" style={{ background: 'var(--copper)', width: '100%' }}>
                        <div className="banner-abbr" style={{ fontSize: 8, lineHeight: 1.3 }}>{fav.game.title || `${fav.game.away_team_abbr} @ ${fav.game.home_team_abbr}`}</div>
                      </div>
                    </Link>
                  ) : (
                    <div className="banner empty" style={{ width: '100%' }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>)}
      </div>

      {/* Stat bar */}
      <div className="stat-bar">
        {[
          { v: stats.logged, l: 'Games' },
          { v: stats.stories, l: 'Stories' },
          { v: stats.venues, l: 'Venues' },
          { v: stats.attended, l: 'Attended' },
        ].map((s, i) => (
          <div key={i} className="stat-box">
            <div className="stat-val">{s.v}</div>
            <div className="stat-lbl">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="prof-tabs">
        {['scorebook', 'stories', 'rafters'].map(t => (
          <button key={t} className={`prof-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'scorebook' ? 'Scorebook' : t === 'stories' ? 'Stories' : 'Rafters'}
          </button>
        ))}
      </div>

      {tab === 'scorebook' && (
        <div style={{ padding: '0 20px' }}>
          {recentLogs.length > 0 ? recentLogs.map(log => {
            const g = log.game
            if (!g) return null
            const sc = scoreWithWinner(g)
            const playoff = isPlayoff(g.series_info)
            const href = log.notable ? `/notable/${log.notable.id}` : `/game/${g.id}`
            return (
              <Link key={log.id} href={href} style={{ textDecoration: 'none' }}>
                <div className="book-entry">
                  <div className="book-date">{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace(' ', '\n')}</div>
                  <div className="book-main">
                    {sc ? (
                      <div className="book-score">
                        <span className={sc.away.won ? '' : 'dim'}>{sc.away.abbr} {sc.away.score}</span>{' / '}<span className={sc.home.won ? '' : 'dim'}>{sc.home.abbr} {sc.home.score}</span>
                      </div>
                    ) : <div className="book-score">{g.title || `${g.away_team_abbr} @ ${g.home_team_abbr}`}</div>}
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
          }) : <div className="empty">No games logged yet.</div>}
        </div>
      )}

      {tab === 'stories' && (
        <div style={{ padding: '0 20px' }}>
          {stories.length > 0 ? stories.map(s => {
            const g = s.game
            const n = s.notable
            const gameTitle = n?.title || g?.title || (g ? `${g.away_team_abbr} ${g.away_score} / ${g.home_score} ${g.home_team_abbr}` : '')
            const gameHref = n ? `/notable/${n.id}` : `/game/${s.game_id}`
            return (
              <div key={s.id} className="book-entry">
                <div className="book-date">{new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace(' ', '\n')}</div>
                <div className="book-main">
                  <Link href={gameHref} style={{ textDecoration: 'none' }}>
                    <div className="book-score">{gameTitle}</div>
                  </Link>
                  {s.rating && <div className="stars" style={{ marginTop: 4 }}>{[1,2,3,4,5].map(i => <span key={i} className={`s${i <= s.rating ? ' on' : ''}`}>&#9733;</span>)}</div>}
                  <div className="book-excerpt">&ldquo;{s.story.slice(0, 120)}{s.story.length > 120 ? '...' : ''}&rdquo;</div>
                  <div style={{ marginTop: 6 }}><HighFive userGameId={s.id} /></div>
                </div>
              </div>
            )
          }) : <div className="empty">No stories yet.</div>}
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
          ) : <div className="empty">No banners hung yet.</div>}
        </div>
      )}

      <div style={{ height: 80 }}></div>
    </div>
  )
}
