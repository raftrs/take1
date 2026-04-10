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
      const { data: p } = await supabase.from('profiles').select('*').eq('username', username).single()
      if (!p) { setLoading(false); return }
      setProf(p)
      const { data: ug } = await supabase.from('user_games').select('id,game_id,rating,attended,story,created_at').eq('user_id', p.id).order('created_at', { ascending: false })
      const games = ug || []
      setStats({ logged: games.length, attended: games.filter(g => g.attended).length, stories: games.filter(g => g.story && g.story.trim()).length, venues: 0 })
      const { count: vc } = await supabase.from('user_venues').select('id', { count: 'exact', head: true }).eq('user_id', p.id)
      setStats(prev => ({ ...prev, venues: vc || 0 }))
      const { count: fc } = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', p.id)
      setFollowerCount(fc || 0)
      const { count: fgc } = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', p.id)
      setFollowingCount(fgc || 0)

      if (games.length > 0) {
        const ids = games.slice(0, 30).map(g => g.game_id).filter(Boolean)
        const { data: gd } = await supabase.from('games').select('id,title,home_team_abbr,away_team_abbr,home_score,away_score,game_date,sport,series_info').in('id', ids)
        const { data: nd } = await supabase.from('notable_games').select('id,title,game_id,sport,game_date').in('game_id', ids)
        const gMap = {}; if (gd) gd.forEach(g => { gMap[g.id] = g })
        const nMap = {}; if (nd) nd.forEach(n => { if (n.game_id) nMap[n.game_id] = n })
        setRecentLogs(games.slice(0, 30).map(ug => ({ ...ug, game: gMap[ug.game_id], notable: nMap[ug.game_id] })))
        setStories(games.filter(g => g.story && g.story.trim()).slice(0, 20).map(ug => ({ ...ug, game: gMap[ug.game_id], notable: nMap[ug.game_id] })))
      }

      const { data: favs } = await supabase.from('favorite_games').select('*').eq('user_id', p.id).order('position')
      if (favs?.length) {
        const gIds = favs.filter(f => f.game_id).map(f => f.game_id)
        const nIds = favs.filter(f => f.notable_game_id).map(f => f.notable_game_id)
        const { data: gd } = gIds.length ? await supabase.from('games').select('id,title,home_team_abbr,away_team_abbr,game_date,sport').in('id', gIds) : { data: [] }
        const { data: nd } = nIds.length ? await supabase.from('notable_games').select('id,title,game_date,sport').in('id', nIds) : { data: [] }
        setFavorites(favs.map(f => ({ ...f, game: gd?.find(g => g.id === f.game_id) || nd?.find(n => n.id === f.notable_game_id) })))
      }

      if (p.favorite_teams?.length) {
        const ids = p.favorite_teams.filter(t => typeof t === 'number')
        const abbrs = p.favorite_teams.filter(t => typeof t === 'string')
        let all = []
        if (ids.length) { const { data: td } = await supabase.from('teams').select('id,team_abbr,team_name,primary_color').in('id', ids); if (td) all.push(...td) }
        if (abbrs.length) { const { data: td } = await supabase.from('teams').select('id,team_abbr,team_name,primary_color').in('team_abbr', abbrs); if (td) all.push(...td) }
        setTeamData(all)
      }
      setLoading(false)
    }
    load()
  }, [username])

  if (loading) return <div className="loading">Loading...</div>
  if (!prof) return <div className="empty">User not found</div>

  const sportBannerColor = (sport) => {
    const colors = { basketball: '#E56020', football: '#013369', baseball: '#CE1141', golf: '#006747' }
    return colors[sport] || 'var(--amber)'
  }
  const initial = (prof.display_name || prof.username || '?')[0].toUpperCase()
  const memberNum = prof.member_number && prof.member_number <= 1000 ? prof.member_number : null

  return (
    <div>
      <TopLogo />
      <BackButton />

      <div style={{ padding: '24px 24px 20px', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {memberNum ? <div className="avatar avatar-lg" style={{background:"var(--amber)",color:"var(--gold)",border:"none",fontWeight:800}}>{memberNum}</div> : <div className="avatar avatar-lg">{initial}</div>}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--ink)', lineHeight: 1.2 }}>{prof.display_name || prof.username}<FounderBadge number={prof.member_number}/></div>
            <div style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>@{prof.username}</div>
            {prof.city && <div style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--amber)', fontWeight: 500, marginTop: 2 }}>{prof.city}</div>}
            <div style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--muted)', marginTop: 6 }}><strong style={{ color: 'var(--ink)' }}>{followingCount}</strong> following &middot; <strong style={{ color: 'var(--ink)' }}>{followerCount}</strong> followers</div>
          </div>
          <FollowButton targetUserId={prof.id} />
        </div>
        {teamData.length > 0 && <div style={{ display: 'flex', gap: 6, marginTop: 18, flexWrap: 'wrap' }}>{teamData.map(t => <Link key={t.id} href={`/team/${t.id}`} style={{ textDecoration: 'none' }}><span style={{ fontFamily: 'var(--ui)', fontSize: 9, fontWeight: 700, padding: '4px 10px', background: `${t.primary_color || 'var(--amber)'}0F`, color: t.primary_color || 'var(--amber)', border: `1px solid ${t.primary_color || 'var(--amber)'}`, borderRadius: 3, letterSpacing: 0.5 }}>{t.team_name.toUpperCase()}</span></Link>)}</div>}

        {favorites.some(f => f.game) && <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 10, fontWeight: 600, letterSpacing: 0.8, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 10 }}>Their Banners</div>
          <div className="rafters-rod"></div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>{[1,2,3,4,5].map(pos => {
            const fav = favorites.find(f => f.position === pos); const hasFav = fav?.game
            return <div key={pos} style={{ flex: 1 }}>{hasFav ? <Link href={fav.notable_game_id ? `/notable/${fav.notable_game_id}` : `/game/${fav.game_id}`} style={{ textDecoration: 'none' }}><div className="banner" style={{ width: '100%', background: sportBannerColor(fav.game.sport) }}><div className="banner-text">{fav.game.title || `${fav.game.away_team_abbr} @ ${fav.game.home_team_abbr}`}{fav.game.game_date && <><br/><span style={{opacity:0.7,fontSize:6}}>{fav.game.game_date.split('-')[0]}</span></>}</div></div></Link> : <div className="banner empty" style={{ width: '100%' }} />}</div>
          })}</div>
        </div>}
      </div>

      <div className="stat-bar">
        {[{ v: stats.logged, l: 'Games' }, { v: stats.stories, l: 'Stories' }, { v: stats.venues, l: 'Venues' }, { v: stats.attended, l: 'Attended' }].map((s, i) => <div key={i} className="stat-box"><div className="stat-val">{s.v}</div><div className="stat-lbl">{s.l}</div></div>)}
      </div>

      <div className="prof-tabs">
        {['scorebook', 'stories', 'rafters'].map(t => <button key={t} className={`prof-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t === 'scorebook' ? 'Scorebook' : t === 'stories' ? 'Stories' : 'Rafters'}</button>)}
      </div>

      {tab === 'scorebook' && <div>{recentLogs.length > 0 ? recentLogs.map(log => {
        const g = log.game; if (!g) return null; const sc = scoreWithWinner(g); const playoff = isPlayoff(g.series_info); const href = log.notable ? `/notable/${log.notable.id}` : `/game/${g.id}`
        return <Link key={log.id} href={href} style={{ textDecoration: 'none' }}><div className="book-entry"><div className="book-date">{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short' }).replace('.', '')}<br/>{new Date(log.created_at).getDate()}</div><div className="book-main">{sc ? <div className="book-score">{sc.away.won ? `${sc.away.abbr} ${sc.away.score}` : <span className="lose">{sc.away.abbr} {sc.away.score}</span>}{' / '}{sc.home.won ? `${sc.home.abbr} ${sc.home.score}` : <span className="lose">{sc.home.score} {sc.home.abbr}</span>}</div> : <div className="book-score">{g.title || `${g.away_team_abbr} @ ${g.home_team_abbr}`}</div>}<div className="book-detail">{formatDate(g.game_date)}{playoff && g.series_info && <> &middot; <span className="playoff">{g.series_info}</span></>}{log.attended && <> &middot; Attended</>}</div>{log.rating && <div className="stars" style={{ marginTop: 5 }}>{[1,2,3,4,5].map(i => <span key={i} className={`s${i <= log.rating ? ' on' : ''}`}>&#9733;</span>)}</div>}{log.story && <div className="book-excerpt">&ldquo;{log.story.slice(0, 90)}{log.story.length > 90 ? '...' : ''}&rdquo;</div>}</div></div></Link>
      }) : <div className="empty">No games logged yet.</div>}</div>}

      {tab === 'stories' && <div>{stories.length > 0 ? stories.map(s => {
        const g = s.game; const n = s.notable; const title = n?.title || g?.title || (g ? `${g.away_team_abbr} @ ${g.home_team_abbr}` : ''); const href = n ? `/notable/${n.id}` : `/game/${s.game_id}`
        return <div key={s.id} className="book-entry"><div className="book-date">{new Date(s.created_at).toLocaleDateString('en-US', { month: 'short' }).replace('.', '')}<br/>{new Date(s.created_at).getDate()}</div><div className="book-main"><Link href={href} style={{ textDecoration: 'none' }}><div className="book-score">{title}</div></Link>{s.rating && <div className="stars" style={{ marginTop: 5 }}>{[1,2,3,4,5].map(i => <span key={i} className={`s${i <= s.rating ? ' on' : ''}`}>&#9733;</span>)}</div>}<div className="book-excerpt">&ldquo;{s.story.slice(0, 120)}{s.story.length > 120 ? '...' : ''}&rdquo;</div><div style={{ marginTop: 6 }}><HighFive userGameId={s.id} /></div></div></div>
      }) : <div className="empty">No stories yet.</div>}</div>}

      {tab === 'rafters' && <div style={{ padding: 20 }}>{favorites.filter(f => f.game).length > 0 ? favorites.filter(f => f.game).map((fav, i) => <Link key={i} href={fav.notable_game_id ? `/notable/${fav.notable_game_id}` : `/game/${fav.game_id}`} className="game-row" style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontFamily: 'var(--ui)', fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>#{fav.position}</span><SportBadge sport={fav.game.sport} /><div><div style={{ fontSize: 14, color: 'var(--ink)' }}>{fav.game.title || `${fav.game.away_team_abbr} @ ${fav.game.home_team_abbr}`}</div><div style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{formatDate(fav.game.game_date)}</div></div></Link>) : <div className="empty">No banners hung yet.</div>}</div>}

      <div style={{ height: 80 }}></div>
    </div>
  )
}
