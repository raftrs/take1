'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate, scoreWithWinner } from '@/lib/utils'
import SportBadge from '@/components/SportBadge'
import HighFive from '@/components/HighFive'
import FounderBadge from '@/components/FounderBadge'

export default function StoryCard({ s, currentUserId, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentCount, setCommentCount] = useState(0)
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

  async function submitComment() {
    if (!newComment.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('Sign in to comment'); return }
    setSubmitting(true)
    const { data: inserted } = await supabase.from('story_comments')
      .insert({ user_game_id: s.id, user_id: user.id, comment: newComment.trim() })
      .select('id,user_id,comment,created_at').single()
    if (inserted) {
      const { data: pr } = await supabase.from('profiles')
        .select('id,username,display_name,member_number').eq('id', user.id).single()
      setComments(prev => [...prev, { ...inserted, profile: pr }])
      setCommentCount(c => c + 1)
    }
    setNewComment('')
    setSubmitting(false)
  }

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
        <button onClick={() => setExpanded(!expanded)} className="action-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {commentCount > 0 && <span>{commentCount}</span>}
        </button>
        <span style={{ flex: 1 }}></span>
        <span className="timestamp">
          {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* Expanded: comments */}
      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--rule-light)' }}>
          {loadingComments ? (
            <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--ui)', padding: '8px 0' }}>Loading...</div>
          ) : (
            <>
              {comments.map(c => {
                const ci = (c.profile?.display_name || c.profile?.username || '?')[0].toUpperCase()
                return (
                  <div key={c.id} className="convo-item">
                    <div className="avatar avatar-sm">{ci}</div>
                    <div style={{ flex: 1 }}>
                      <div>
                        <Link href={c.profile?.username ? `/user/${c.profile.username}` : '#'} style={{ textDecoration: 'none' }}>
                          <span className="convo-name">{c.profile?.display_name || c.profile?.username || 'Someone'}</span>
                        </Link>
                        <FounderBadge number={c.profile?.member_number} />
                        <span className="timestamp" style={{ marginLeft: 8 }}>
                          {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="convo-body">{c.comment}</div>
                    </div>
                  </div>
                )
              })}
              {comments.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--ui)', padding: '4px 0 8px' }}>No comments yet. Be the first.</div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'flex-end' }}>
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !submitting) submitComment() }}
                  placeholder="Add a comment..."
                  style={{
                    flex: 1, padding: '10px 14px', fontSize: 13,
                    border: '1px solid var(--rule)', borderRadius: 4,
                    background: 'var(--surface)', color: 'var(--ink)',
                    outline: 'none', fontFamily: 'var(--body)',
                  }}
                />
                <button onClick={submitComment} disabled={submitting || !newComment.trim()} className={`post-btn${newComment.trim() ? '' : ' off'}`}>Post</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
