'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate, scoreWithWinner } from '@/lib/utils'
import SportBadge from '@/components/SportBadge'
import HighFive from '@/components/HighFive'
import FounderBadge from '@/components/FounderBadge'

export default function StoryCard({ s, currentUserId, onDelete }) {
  const [commentCount, setCommentCount] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const p = s.profile
  const g = s.game
  const n = s.notable
  const gameTitle = n?.title || g?.title || (g ? `${g.away_team_abbr} ${g.away_score} / ${g.home_score} ${g.home_team_abbr}` : 'A game')
  const gameHref = n ? `/notable/${n.id}` : `/game/${s.game_id}`
  const gameDate = n?.game_date || g?.game_date
  const gameSport = n?.sport || g?.sport
  const isLong = s.story && s.story.length > 180
  const isOwn = currentUserId && s.user_id === currentUserId
  const sc = g ? scoreWithWinner(g) : null
  const initial = (p?.display_name || p?.username || '?')[0].toUpperCase()
  const memberNum = p?.member_number && p.member_number <= 1000 ? p.member_number : null

  useEffect(() => {
    async function loadCount() {
      const { count } = await supabase.from('story_comments')
        .select('id', { count: 'exact', head: true }).eq('user_game_id', s.id)
      setCommentCount(count || 0)
    }
    loadCount()
  }, [s.id])

  useEffect(() => {
    if (!expanded) return
    async function loadComments() {
      setLoadingComments(true)
      const { data: cm } = await supabase.from('story_comments')
        .select('id,user_id,comment,created_at')
        .eq('user_game_id', s.id)
        .order('created_at', { ascending: true }).limit(50)
      if (cm?.length) {
        const uids = [...new Set(cm.map(c => c.user_id))]
        const { data: profiles } = await supabase.from('profiles')
          .select('id,username,display_name,member_number').in('id', uids)
        const pMap = {}
        if (profiles) profiles.forEach(pr => { pMap[pr.id] = pr })
        setComments(cm.map(c => ({ ...c, profile: pMap[c.user_id] })))
      }
      setLoadingComments(false)
    }
    loadComments()
  }, [expanded, s.id])



  async function handleDelete() {
    if (!confirm('Delete this story?')) return
    await supabase.from('user_games').update({ story: null }).eq('id', s.id)
    if (onDelete) onDelete(s.id)
  }

  return (
    <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>
      {/* Byline */}
      <div className="byline" style={{ marginBottom: 16 }}>
        <Link href={p?.username ? `/user/${p.username}` : '#'} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {memberNum ? <div className="avatar" style={{background:"var(--amber)",color:"var(--gold)",border:"none",fontWeight:800,fontSize:14}}>{memberNum}</div> : <div className="avatar">{initial}</div>}
          <div>
            <div><span className="author-name">{p?.display_name || p?.username || 'A fan'}</span><FounderBadge number={p?.member_number} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              {s.attended && <span className="attended-badge">WAS THERE</span>}
              <span className="timestamp">{p?.city || ''}</span>
            </div>
          </div>
        </Link>
        {isOwn && (
          <button onClick={handleDelete} className="action-btn" style={{ marginLeft: 'auto', fontSize: 9 }}>delete</button>
        )}
      </div>

      {/* Game ref (ticket stub) */}
      <Link href={gameHref} style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
        <div className="game-ref" style={{ width: 'fit-content', maxWidth: '100%' }}>
          {gameSport && <SportBadge sport={gameSport} />}
          {sc ? (
            <span className="game-ref-score">
              {sc.away.abbr} {sc.away.score} <span className={sc.away.won ? '' : 'lose'}>/ {sc.home.score} {sc.home.abbr}</span>
            </span>
          ) : (
            <span className="game-ref-score">{gameTitle}</span>
          )}
          {g?.series_info && <span className="game-ref-series">{g.series_info}</span>}
          {gameDate && <span className="game-ref-detail" style={{ marginLeft: 'auto' }}>{formatDate(gameDate)}</span>}
        </div>
      </Link>

      {/* Story text */}
      <div
        onClick={() => { if (!expanded && isLong) setExpanded(true) }}
        className="story-text"
        style={{ cursor: isLong && !expanded ? 'pointer' : 'default' }}
      >
        {expanded || !isLong ? (
          <><span className="story-opener">{s.story.split('. ')[0]}.</span>{s.story.indexOf('. ') > -1 ? ' ' + s.story.slice(s.story.indexOf('. ') + 2) : ''}</>
        ) : (
          <>{s.story.slice(0, 180)}... <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600, fontFamily: 'var(--ui)' }}>Read more</span></>
        )}
      </div>

      {/* Stars */}
      {s.rating && (
        <div className="stars" style={{ marginTop: 12 }}>
          {[1,2,3,4,5].map(i => <span key={i} className={`s${i <= s.rating ? ' on' : ''}`}>&#9733;</span>)}
        </div>
      )}

      {/* Actions */}
      <div className="story-actions">
        <HighFive userGameId={s.id} />
        <Link href={`/story/${s.id}`} className="action-btn" style={{ textDecoration:'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {commentCount > 0 && <span>{commentCount}</span>}
        </Link>
        <span style={{ flex: 1 }}></span>
        <span className="timestamp">
          {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

    </div>
  )
}
