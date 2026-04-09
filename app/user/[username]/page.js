'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import BackButton from '@/components/BackButton'
import TopLogo from '@/components/TopLogo'
import SportBadge from '@/components/SportBadge'
import FollowButton from '@/components/FollowButton'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from('profiles')
        .select('*').eq('username', username).single()
      if (!p) { setLoading(false); return }
      setProf(p)

      // Stats
      const { data: ug } = await supabase.from('user_games').select('id,game_id,rating,attended,story,created_at')
        .eq('user_id', p.id).order('created_at', { ascending: false })
      const games = ug || []
      const logged = games.length
      const attended = games.filter(g => g.attended).length
      const storyCount = games.filter(g => g.story && g.story.trim()).length
      const { count: venueCount } = await supabase.from('user_venues')
        .select('id', { count: 'exact', head: true }).eq('user_id', p.id)
      setStats({ logged, attended, stories: storyCount, venues: venueCount || 0 })

      // Follow counts
      const { count: fc } = await supabase.from('follows')
        .select('id', { count: 'exact', head: true }).eq('following_id', p.id)
      setFollowerCount(fc || 0)
      const { count: fgc } = await supabase.from('follows')
        .select('id', { count: 'exact', head: true }).eq('follower_id', p.id)
      setFollowingCount(fgc || 0)

      // Stories with game data
      const storiesData = games.filter(g => g.story && g.story.trim()).slice(0, 20)
      if (storiesData.length) {
        const gids = [...new Set(storiesData.map(s => s.game_id).filter(Boolean))]
        const { data: gd } = await supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,sport,title').in('id', gids)
        const { data: nd } = await supabase.from('notable_games').select('id,title,game_id,sport,game_date').in('game_id', gids)
        const gMap = {}; if (gd) gd.forEach(g => { gMap[g.id] = g })
        const nMap = {}; if (nd) nd.forEach(n => { if (n.game_id) nMap[n.game_id] = n })
        setStories(storiesData.map(s => ({ ...s, game: gMap[s.game_id], notable: nMap[s.game_id] })))
      }

      // Favorites (Rafters)
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
        if (ids.length) {
          const { data: td } = await supabase.from('teams').select('id,team_abbr,team_name,primary_color').in('id', ids)
          if (td) allTeams.push(...td)
        }
        if (abbrs.length) {
          const { data: td } = await supabase.from('teams').select('id,team_abbr,team_name,primary_color').in('team_abbr', abbrs)
          if (td) allTeams.push(...td)
        }
        setTeamData(allTeams)
      }

      setLoading(false)
    }
    load()
  }, [username])

  if (loading) return <div className="loading">Loading...</div>
  if (!prof) return <div className="empty">User not found</div>

  return (
    <div>
      <TopLogo />
      <BackButton />

      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '2px solid var(--rule)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 22, color: 'var(--ink)', lineHeight: 1.2 }}>{prof.display_name || prof.username}</div>
            <div className="sans" style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>@{prof.username}</div>
            {prof.city && <div className="sans" style={{ fontSize: 11, color: 'var(--copper)', marginTop: 4 }}>{prof.city}</div>}
            <div className="sans" style={{ fontSize: 10, color: 'var(--dim)', marginTop: 6 }}>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{followerCount}</span> follower{followerCount !== 1 ? 's' : ''}
              <span style={{ margin: '0 6px' }}>&middot;</span>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{followingCount}</span> following
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {prof.member_number && prof.member_number <= 1000 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 42, height: 56 }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 42, height: 56, background: 'var(--gold)', clipPath: 'polygon(0 0,100% 0,100% 85%,50% 100%,0 85%)' }} />
                  <div style={{ position: 'absolute', top: 2, left: 2, width: 38, height: 52, background: 'var(--copper)', clipPath: 'polygon(0 0,100% 0,100% 85%,50% 100%,0 85%)', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 8 }}>
                    <div className="sans" style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{prof.member_number}</div>
                  </div>
                </div>
                <div className="sans" style={{ fontSize: 6, letterSpacing: 1.5, fontWeight: 700, color: 'var(--gold)', marginTop: 2, textAlign: 'center', lineHeight: 1.3 }}>FOUNDING<br/>MEMBER</div>
              </div>
            )}
            <FollowButton targetUserId={prof.id} />
          </div>
        </div>

        {/* Teams */}
        {teamData.length > 0 && <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {teamData.map(t => (
            <Link key={t.id} href={`/team/${t.id}`} style={{ textDecoration: 'none' }}>
              <span className="sans" style={{ fontSize: 10, padding: '3px 8px', background: `${t.primary_color || 'var(--copper)'}12`, color: t.primary_color || 'var(--copper)', border: `1px solid ${t.primary_color || 'var(--copper)'}`, letterSpacing: 0.5 }}>{t.team_name}</span>
            </Link>
          ))}
        </div>}

        {/* Rafters */}
        {favorites.some(f => f.game) && (<div style={{ marginTop: 16 }}>
          <div className="sans" style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: 2, fontWeight: 600, marginBottom: 6 }}>THEIR RAFTERS</div>
          <div style={{ height: 3, background: 'linear-gradient(90deg, var(--faint), var(--dim), var(--faint))', borderRadius: 2 }} />
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {[1,2,3,4,5].map(pos => {
              const fav = favorites.find(f => f.position === pos)
              const hasFav = fav?.game
              return (
                <div key={pos} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {hasFav ? (
                    <Link href={fav.notable_game_id ? `/notable/${fav.notable_game_id}` : `/game/${fav.game_id}`} style={{ textDecoration: 'none', width: '100%' }}>
                      <div style={{
                        width: '100%', minHeight: 64, padding: '8px 4px 12px',
                        background: 'var(--copper)', color: '#fff',
                        clipPath: 'polygon(0 0,100% 0,100% 85%,50% 100%,0 85%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 8, lineHeight: 1.3, fontWeight: 600, padding: '0 2px' }}>{fav.game.title || `${fav.game.away_team_abbr} @ ${fav.game.home_team_abbr}`}</div>
                      </div>
                    </Link>
                  ) : (
                    <div style={{
                      width: '100%', minHeight: 64, padding: '8px 4px 12px',
                      background: 'var(--surface)', border: '1px dashed var(--faint)',
                      clipPath: 'polygon(0 0,100% 0,100% 85%,50% 100%,0 85%)',
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>)}
      </div>

      {/* Stat grid */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--faint)' }}>
        {[
          { v: stats.logged, l: 'LOGGED' },
          { v: stats.attended, l: 'ATTENDED' },
          { v: stats.venues, l: 'VENUES' },
          { v: stats.stories, l: 'STORIES' },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', padding: '14px 4px', borderRight: i < 3 ? '1px solid var(--faint)' : 'none' }}>
            <div style={{ fontSize: 20, color: 'var(--ink)' }}>{s.v}</div>
            <div className="sans" style={{ fontSize: 7, color: 'var(--dim)', letterSpacing: 1, fontWeight: 600, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Stories */}
      {stories.length > 0 && (<>
        <div style={{ padding: '16px 20px 0' }}>
          <div className="sec-head">FROM THE STANDS</div>
        </div>
        {stories.map(s => {
          const g = s.game
          const n = s.notable
          const gameTitle = n?.title || g?.title || (g ? `${g.away_team_abbr} ${g.away_score} / ${g.home_score} ${g.home_team_abbr}` : '')
          const gameHref = n ? `/notable/${n.id}` : `/game/${s.game_id}`
          return (
            <div key={s.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--faint)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {s.rating && <span style={{ fontSize: 12, color: 'var(--gold)' }}>{'★'.repeat(s.rating)}</span>}
                {s.attended && <span className="sans" style={{ fontSize: 9, color: 'var(--copper)', fontWeight: 600, letterSpacing: 0.5, padding: '2px 6px', border: '1px solid var(--copper)', borderRadius: 2 }}>WAS THERE</span>}
              </div>
              <Link href={gameHref} style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>{gameTitle}</div>
                <div className="sans" style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{formatDate(g?.game_date || n?.game_date)}</div>
              </Link>
              <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, marginTop: 8, fontStyle: 'italic' }}>
                &ldquo;{s.story}&rdquo;
              </div>
              <div style={{ marginTop: 6 }}><HighFive userGameId={s.id} /></div>
            </div>
          )
        })}
      </>)}

      <div style={{ height: 80 }}></div>
    </div>
  )
}
