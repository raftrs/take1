'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate, sportColor } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import TopLogo from '@/components/TopLogo'
import HighFive from '@/components/HighFive'
import FollowButton from '@/components/FollowButton'
import SportBadge from '@/components/SportBadge'

export default function CommunityPage() {
  const { user, profile } = useAuth()
  const [stories, setStories] = useState([])
  const [members, setMembers] = useState([])
  const [cityMembers, setCityMembers] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Load recent stories with profile + game data
      const { data: st } = await supabase.from('user_games')
        .select('id,user_id,story,rating,attended,created_at,game_id')
        .not('story', 'is', null).neq('story', '')
        .order('created_at', { ascending: false }).limit(30)

      if (st?.length) {
        // Get profiles
        const uids = [...new Set(st.map(s => s.user_id))]
        const { data: profiles } = await supabase.from('profiles').select('id,username,display_name,city').in('id', uids)
        const pMap = {}
        if (profiles) profiles.forEach(p => { pMap[p.id] = p })

        // Get games
        const gids = [...new Set(st.map(s => s.game_id).filter(Boolean))]
        const { data: games } = await supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,sport,title').in('id', gids)
        const gMap = {}
        if (games) games.forEach(g => { gMap[g.id] = g })

        // Check if any are notable games
        const { data: notables } = await supabase.from('notable_games').select('id,title,game_id,sport,game_date').in('game_id', gids)
        const nMap = {}
        if (notables) notables.forEach(n => { if (n.game_id) nMap[n.game_id] = n })

        setStories(st.map(s => ({
          ...s,
          profile: pMap[s.user_id],
          game: gMap[s.game_id],
          notable: nMap[s.game_id],
        })))
      }

      // Discover: recently joined members
      const { data: allMembers } = await supabase.from('profiles')
        .select('id,username,display_name,city,favorite_teams,member_number')
        .order('created_at', { ascending: false }).limit(20)
      setMembers(allMembers || [])

      // City-based discovery
      if (profile?.city) {
        const { data: cm } = await supabase.from('profiles')
          .select('id,username,display_name,city,member_number')
          .ilike('city', `%${profile.city}%`).limit(10)
        if (cm) setCityMembers(cm.filter(m => m.id !== user?.id))
      }

      // Team-based discovery
      if (profile?.favorite_teams?.length) {
        const { data: allP } = await supabase.from('profiles')
          .select('id,username,display_name,city,favorite_teams,member_number')
          .not('favorite_teams', 'is', null).limit(50)
        if (allP) {
          const myTeams = profile.favorite_teams
          const matches = allP.filter(p => {
            if (p.id === user?.id) return false
            if (!Array.isArray(p.favorite_teams)) return false
            return p.favorite_teams.some(t => myTeams.includes(t))
          })
          setTeamMembers(matches.slice(0, 10))
        }
      }

      setLoading(false)
    }
    load()
  }, [user, profile])

  if (loading) return <div className="loading">Loading...</div>

  function StoryCard({ s }) {
    const p = s.profile
    const g = s.game
    const n = s.notable
    const gameTitle = n?.title || g?.title || (g ? `${g.away_team_abbr} ${g.away_score} / ${g.home_score} ${g.home_team_abbr}` : 'A game')
    const gameHref = n ? `/notable/${n.id}` : `/game/${s.game_id}`
    const gameDate = n?.game_date || g?.game_date
    const gameSport = n?.sport || g?.sport

    return (
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--faint)' }}>
        {/* Username + rating */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <Link href={p?.username ? `/user/${p.username}` : '#'} style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: 14, color: 'var(--copper)', fontWeight: 600 }}>
              {p?.display_name || p?.username || 'A fan'}
            </div>
          </Link>
        </div>
        {/* Rating + attendance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {s.rating && <span style={{ fontSize: 13, color: 'var(--gold)' }}>{'★'.repeat(s.rating)}</span>}
          {s.attended && <span className="sans" style={{ fontSize: 9, color: 'var(--copper)', fontWeight: 600, letterSpacing: 0.5, padding: '2px 6px', border: '1px solid var(--copper)', borderRadius: 2 }}>WAS THERE</span>}
        </div>
        {/* Game link */}
        <Link href={gameHref} style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {gameSport && <SportBadge sport={gameSport} />}
            <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>{gameTitle}</div>
          </div>
          {gameDate && <div className="sans" style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2, marginLeft: gameSport ? 22 : 0 }}>{formatDate(gameDate)}</div>}
        </Link>
        {/* Story text */}
        <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, fontStyle: 'italic' }}>
          &ldquo;{s.story.length > 200 ? s.story.slice(0, 200) + '...' : s.story}&rdquo;
        </div>
        {/* High five + timestamp */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <HighFive userGameId={s.id} />
          <div className="sans" style={{ fontSize: 10, color: 'var(--dim)' }}>
            {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>
    )
  }

  function MemberCard({ m }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--faint)' }}>
        <Link href={`/user/${m.username}`} style={{ textDecoration: 'none', flex: 1 }}>
          <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>{m.display_name || m.username}</div>
          <div className="sans" style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
            @{m.username}{m.city ? ` \u00B7 ${m.city}` : ''}
            {m.member_number && m.member_number <= 1000 ? ` \u00B7 #${m.member_number}` : ''}
          </div>
        </Link>
        {user && m.id !== user.id && <FollowButton targetUserId={m.id} />}
      </div>
    )
  }

  return (
    <div>
      <TopLogo />
      <div style={{ padding: '16px 20px 0', borderBottom: '2px solid var(--rule)' }}>
        <div style={{ fontSize: 20, color: 'var(--ink)', marginBottom: 4 }}>Community</div>
        <div className="sans" style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 12, fontStyle: 'italic' }}>Stories from the stands</div>
      </div>

      {/* STORY FEED */}
      {stories.length > 0 ? (
        stories.map(s => <StoryCard key={s.id} s={s} />)
      ) : (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 8 }}>No stories yet</div>
          <div className="sans" style={{ fontSize: 12, color: 'var(--dim)' }}>Be the first to share a story from the stands.</div>
          <Link href="/log" className="sans" style={{ display: 'inline-block', marginTop: 16, padding: '10px 24px', background: 'var(--copper)', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: 1, textDecoration: 'none' }}>FIND A GAME</Link>
        </div>
      )}

      {/* DISCOVER */}
      <hr className="sec-rule" /><hr className="sec-rule-thin" />
      <div style={{ padding: 20 }}>
        <div className="sec-head">DISCOVER MEMBERS</div>

        {/* City-based */}
        {cityMembers.length > 0 && (<div style={{ marginBottom: 20 }}>
          <div className="sans" style={{ fontSize: 10, color: 'var(--copper)', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>IN YOUR AREA</div>
          {cityMembers.map(m => <MemberCard key={m.id} m={m} />)}
        </div>)}

        {/* Team-based */}
        {teamMembers.length > 0 && (<div style={{ marginBottom: 20 }}>
          <div className="sans" style={{ fontSize: 10, color: 'var(--copper)', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>FANS OF YOUR TEAMS</div>
          {teamMembers.map(m => <MemberCard key={m.id} m={m} />)}
        </div>)}

        {/* All members */}
        <div>
          <div className="sans" style={{ fontSize: 10, color: 'var(--copper)', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>ALL MEMBERS</div>
          {members.filter(m => m.id !== user?.id).map(m => <MemberCard key={m.id} m={m} />)}
          {members.length === 0 && <div className="sans" style={{ fontSize: 12, color: 'var(--dim)', padding: '12px 0' }}>No other members yet. You're early.</div>}
        </div>
      </div>

      <div style={{ height: 80 }}></div>
    </div>
  )
}
