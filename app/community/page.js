'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import TopLogo from '@/components/TopLogo'
import HighFive from '@/components/HighFive'
import FollowButton from '@/components/FollowButton'
import FounderBadge from '@/components/FounderBadge'
import SportBadge from '@/components/SportBadge'

export default function CommunityPage() {
  const { user, profile } = useAuth()
  const [stories, setStories] = useState([])
  const [members, setMembers] = useState([])
  const [cityMembers, setCityMembers] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [myStats, setMyStats] = useState({ followers: 0, following: 0, highFives: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (user) {
        const { count: fc } = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id)
        const { count: fgc } = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id)
        const { data: myStories } = await supabase.from('user_games').select('id').eq('user_id', user.id).not('story', 'is', null).neq('story', '')
        let totalHF = 0
        if (myStories?.length) {
          const { count: hfc } = await supabase.from('story_high_fives').select('id', { count: 'exact', head: true }).in('user_game_id', myStories.map(s => s.id))
          totalHF = hfc || 0
        }
        setMyStats({ followers: fc || 0, following: fgc || 0, highFives: totalHF })
      }

      const { data: st } = await supabase.from('user_games')
        .select('id,user_id,story,rating,attended,created_at,game_id')
        .not('story', 'is', null).neq('story', '')
        .order('created_at', { ascending: false }).limit(30)

      if (st?.length) {
        const uids = [...new Set(st.map(s => s.user_id))]
        const { data: profiles } = await supabase.from('profiles').select('id,username,display_name,member_number').in('id', uids)
        const pMap = {}; if (profiles) profiles.forEach(p => { pMap[p.id] = p })
        const gids = [...new Set(st.map(s => s.game_id).filter(Boolean))]
        const { data: games } = await supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,sport,title').in('id', gids)
        const gMap = {}; if (games) games.forEach(g => { gMap[g.id] = g })
        const { data: notables } = await supabase.from('notable_games').select('id,title,game_id,sport,game_date').in('game_id', gids)
        const nMap = {}; if (notables) notables.forEach(n => { if (n.game_id) nMap[n.game_id] = n })
        // Get reply counts
        const storyIds = st.map(s => s.id)
        const { data: replyCounts } = await supabase.from('story_comments').select('user_game_id').in('user_game_id', storyIds)
        const rcMap = {}
        if (replyCounts) replyCounts.forEach(r => { rcMap[r.user_game_id] = (rcMap[r.user_game_id] || 0) + 1 })
        setStories(st.map(s => ({ ...s, profile: pMap[s.user_id], game: gMap[s.game_id], notable: nMap[s.game_id], replyCount: rcMap[s.id] || 0 })))
      }

      const { data: allMembers } = await supabase.from('profiles')
        .select('id,username,display_name,city,favorite_teams,member_number')
        .order('created_at', { ascending: false }).limit(20)
      setMembers(allMembers || [])

      if (profile?.city) {
        const { data: cm } = await supabase.from('profiles')
          .select('id,username,display_name,city,member_number')
          .ilike('city', `%${profile.city}%`).limit(10)
        if (cm) setCityMembers(cm.filter(m => m.id !== user?.id))
      }

      if (profile?.favorite_teams?.length) {
        const { data: allP } = await supabase.from('profiles')
          .select('id,username,display_name,city,favorite_teams,member_number')
          .not('favorite_teams', 'is', null).limit(50)
        if (allP) {
          const myTeams = profile.favorite_teams
          setTeamMembers(allP.filter(p => p.id !== user?.id && Array.isArray(p.favorite_teams) && p.favorite_teams.some(t => myTeams.includes(t))).slice(0, 10))
        }
      }

      setLoading(false)
    }
    load()
  }, [user, profile])

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div>
      <TopLogo />
      <div style={{ padding: '16px 20px 0', borderBottom: '2px solid var(--rule)' }}>
        <div style={{ fontSize: 20, color: 'var(--ink)', marginBottom: 4 }}>Community</div>
        <div className="sans" style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 12, fontStyle: 'italic' }}>Stories from the stands</div>
      </div>

      {/* Stats bar */}
      {user && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--faint)' }}>
          {[
            { v: myStats.followers, l: 'Followers' },
            { v: myStats.following, l: 'Following' },
            { v: myStats.highFives, l: 'High Fives' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '12px 4px', borderRight: i < 2 ? '1px solid var(--faint)' : 'none' }}>
              <div style={{ fontSize: 18, color: 'var(--ink)' }}>{s.v}</div>
              <div className="sans" style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: 1, fontWeight: 600, marginTop: 2 }}>{s.l.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}

      {/* STORIES */}
      {stories.length > 0 ? stories.map(s => {
        const p = s.profile
        const g = s.game
        const n = s.notable
        const gameTitle = n?.title || g?.title || (g ? `${g.away_team_abbr} ${g.away_score} / ${g.home_score} ${g.home_team_abbr}` : '')
        const gameSport = n?.sport || g?.sport

        return (
          <Link key={s.id} href={`/story/${s.id}`} style={{ display: 'block', padding: '18px 20px', borderBottom: '1px solid var(--faint)', textDecoration: 'none' }}>
            {/* Author line */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--copper)', fontWeight: 600 }}>{p?.display_name || p?.username || 'A fan'}</span>
              <FounderBadge number={p?.member_number} />
              {s.rating && <span style={{ fontSize: 12, color: 'var(--gold)', marginLeft: 8 }}>{'★'.repeat(s.rating)}</span>}
              {s.attended && <span className="sans" style={{ fontSize: 8, color: 'var(--copper)', fontWeight: 700, letterSpacing: 0.5, marginLeft: 8 }}>WAS THERE</span>}
            </div>
            {/* Game */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              {gameSport && <SportBadge sport={gameSport} />}
              <span style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 600 }}>{gameTitle}</span>
            </div>
            {/* Story excerpt */}
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, fontStyle: 'italic', marginTop: 6 }}>
              {s.story.length > 140 ? s.story.slice(0, 140) + '...' : s.story}
            </div>
            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }} onClick={e => e.preventDefault()}>
              <HighFive userGameId={s.id} />
              {s.replyCount > 0 && (
                <span className="sans" style={{ fontSize: 10, color: 'var(--dim)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  {s.replyCount}
                </span>
              )}
              <span className="sans" style={{ fontSize: 10, color: 'var(--dim)', marginLeft: 'auto' }}>
                {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </Link>
        )
      }) : (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 8 }}>No stories yet</div>
          <div className="sans" style={{ fontSize: 12, color: 'var(--dim)' }}>Be the first to share a story from the stands.</div>
          <Link href="/log" className="sans" style={{ display: 'inline-block', marginTop: 16, padding: '10px 24px', background: 'var(--copper)', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: 1, textDecoration: 'none' }}>FIND A GAME</Link>
        </div>
      )}

      {/* DISCOVER */}
      <hr className="sec-rule" /><hr className="sec-rule-thin" />
      <div style={{ padding: 20 }}>
        <div className="sec-head">DISCOVER</div>
        {cityMembers.length > 0 && (<div style={{ marginBottom: 24 }}>
          <div className="sans" style={{ fontSize: 9, color: 'var(--copper)', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>IN YOUR AREA</div>
          {cityMembers.map(m => <MemberRow key={m.id} m={m} user={user} />)}
        </div>)}
        {teamMembers.length > 0 && (<div style={{ marginBottom: 24 }}>
          <div className="sans" style={{ fontSize: 9, color: 'var(--copper)', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>FANS OF YOUR TEAMS</div>
          {teamMembers.map(m => <MemberRow key={m.id} m={m} user={user} />)}
        </div>)}
        <div>
          <div className="sans" style={{ fontSize: 9, color: 'var(--copper)', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>ALL MEMBERS</div>
          {members.filter(m => m.id !== user?.id).map(m => <MemberRow key={m.id} m={m} user={user} />)}
        </div>
      </div>
      <div style={{ height: 80 }}></div>
    </div>
  )
}

function MemberRow({ m, user }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--faint)' }}>
      <Link href={`/user/${m.username}`} style={{ textDecoration: 'none', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>{m.display_name || m.username}</span>
          <FounderBadge number={m.member_number} />
        </div>
        <div className="sans" style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
          @{m.username}{m.city ? ` \u00B7 ${m.city}` : ''}
        </div>
      </Link>
      {user && m.id !== user.id && <FollowButton targetUserId={m.id} />}
    </div>
  )
}
