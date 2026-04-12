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
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--faint)' }}>
      {/* Byline: avatar + name + founder + timestamp */}
      <div className="byline">
        <Link href={p?.username ? `/user/${p.username}` : '#'} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <div className="avatar">{initial}</div>
          <span className="author-name">{p?.display_name || p?.username || 'A fan'}</span>
          <FounderBadge number={p?.member_number} />
        </Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="timestamp">
            {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          {isOwn && (
            <button onClick={handleDelete} className="action-btn" style={{ fontSize: 9 }}>delete</button>
          )}
        </div>
      </div>

      {/* Game ref card */}
      <Link href={gameHref} style={{ textDecoration: 'none', display: 'block', margin: '10px 0' }}>
        <div className="game-ref" style={{ width: 'fit-content' }}>
          {gameSport && <SportBadge sport={gameSport} />}
          {sc ? (
            <span className="game-ref-score">
              <span className={sc.away.won ? '' : 'dim'}>{sc.away.abbr} {sc.away.score}</span>
              {' / '}
              <span className={sc.home.won ? '' : 'dim'}>{sc.home.abbr} {sc.home.score}</span>
            </span>
          ) : (
            <span className="game-ref-score">{gameTitle}</span>
          )}
          {g?.series_info && <span className="game-ref-series">{g.series_info}</span>}
        </div>
        {gameDate && <div className="game-ref-detail" style={{ marginTop: -8, marginBottom: 4, paddingLeft: 2 }}>{formatDate(gameDate)}</div>}
      </Link>

      {/* Rating + attendance */}
      {(s.rating || s.attended) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {s.rating && <span className="stars">{[1,2,3,4,5].map(i => <span key={i} className={`s${i <= s.rating ? ' on' : ''}`}>&#9733;</span>)}</span>}
          {s.attended && <span className="mono" style={{ fontSize: 9, color: 'var(--copper)', fontWeight: 700, letterSpacing: 0.5, padding: '2px 6px', border: '1px solid var(--copper)', borderRadius: 2 }}>WAS THERE</span>}
        </div>
      )}

      {/* Story text */}
      <div
        onClick={() => { if (!expanded && isLong) setExpanded(true) }}
        className="story-text"
        style={{ cursor: isLong && !expanded ? 'pointer' : 'default', fontStyle: 'italic' }}
      >
        {expanded || !isLong ? (
          <>&ldquo;<span className="story-opener">{s.story.split('. ')[0]}.</span>{s.story.indexOf('. ') > -1 ? ' ' + s.story.slice(s.story.indexOf('. ') + 2) : ''}&rdquo;</>
        ) : (
          <>&ldquo;{s.story.slice(0, 180)}...&rdquo; <span className="mono" style={{ fontSize: 11, color: 'var(--copper)', fontWeight: 600, fontStyle: 'normal' }}>Read more</span></>
        )}
      </div>

      {/* Actions */}
      <div className="story-actions">
        <HighFive userGameId={s.id} />
        <button onClick={() => setExpanded(!expanded)} className="action-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {commentCount > 0 && <span>{commentCount}</span>}
        </button>
      </div>

      {/* Expanded: comments */}
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--faint)' }}>
          {loadingComments ? (
            <div className="mono" style={{ fontSize: 11, color: 'var(--dim)', padding: '8px 0' }}>Loading...</div>
          ) : (
            <>
              {comments.map(c => {
                const ci = (c.profile?.display_name || c.profile?.username || '?')[0].toUpperCase()
                return (
                  <div key={c.id} className="convo-item">
                    <div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{ci}</div>
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
                <div className="mono" style={{ fontSize: 11, color: 'var(--dim)', padding: '4px 0 8px' }}>No comments yet. Be the first.</div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'flex-end' }}>
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !submitting) submitComment() }}
                  placeholder="Add a comment..."
                  className="sans"
                  style={{
                    flex: 1, padding: '8px 12px', fontSize: 13,
                    border: '1px solid var(--faint)', borderRadius: 4,
                    background: 'var(--surface)', color: 'var(--ink)', outline: 'none',
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
