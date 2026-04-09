'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import SportBadge from '@/components/SportBadge'
import HighFive from '@/components/HighFive'
import FounderBadge from '@/components/FounderBadge'

// Props:
// s = { id, user_id, story, rating, attended, created_at, game_id,
//        profile: { id, username, display_name, member_number },
//        game: { id, game_date, home_team_abbr, away_team_abbr, home_score, away_score, sport, title },
//        notable: { id, title, game_id, sport, game_date } (optional) }
// currentUserId = current logged-in user's ID (for delete)
// onDelete = callback when story deleted

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

  // Load comment count on mount
  useEffect(() => {
    async function loadCount() {
      const { count } = await supabase.from('story_comments')
        .select('id', { count: 'exact', head: true }).eq('user_game_id', s.id)
      setCommentCount(count || 0)
    }
    loadCount()
  }, [s.id])

  // Load full comments when expanded
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
      {/* Username + founder badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Link href={p?.username ? `/user/${p.username}` : '#'} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: 'var(--copper)', fontWeight: 600 }}>
            {p?.display_name || p?.username || 'A fan'}
          </span>
          <FounderBadge number={p?.member_number} />
        </Link>
        {isOwn && (
          <button onClick={handleDelete} className="sans" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 10, color: 'var(--dim)', padding: '2px 6px',
          }}>delete</button>
        )}
      </div>

      {/* Rating + attendance */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 8 }}>
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
      <div
        onClick={() => { if (!expanded) setExpanded(true) }}
        style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, fontStyle: 'italic', cursor: isLong && !expanded ? 'pointer' : 'default' }}
      >
        &ldquo;{expanded || !isLong ? s.story : s.story.slice(0, 180) + '...'}&rdquo;
        {isLong && !expanded && (
          <span className="sans" style={{ fontSize: 11, color: 'var(--copper)', fontWeight: 600, fontStyle: 'normal', marginLeft: 4 }}>Read more</span>
        )}
      </div>

      {/* High five + comment count + timestamp */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <HighFive userGameId={s.id} />
          <button onClick={() => setExpanded(!expanded)} className="sans" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 600, color: expanded ? 'var(--copper)' : 'var(--dim)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {commentCount > 0 && <span>{commentCount}</span>}
          </button>
        </div>
        <div className="sans" style={{ fontSize: 10, color: 'var(--dim)' }}>
          {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Expanded: comments + input */}
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--faint)' }}>
          {loadingComments ? (
            <div className="sans" style={{ fontSize: 11, color: 'var(--dim)', padding: '8px 0' }}>Loading...</div>
          ) : (
            <>
              {comments.map(c => (
                <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--faint)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <Link href={c.profile?.username ? `/user/${c.profile.username}` : '#'} style={{ textDecoration: 'none' }}>
                      <span className="sans" style={{ fontSize: 12, color: 'var(--copper)', fontWeight: 600 }}>
                        {c.profile?.display_name || c.profile?.username || 'Someone'}
                      </span>
                    </Link>
                    <FounderBadge number={c.profile?.member_number} />
                    <span className="sans" style={{ fontSize: 10, color: 'var(--dim)', marginLeft: 8 }}>
                      {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginTop: 4 }}>{c.comment}</div>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="sans" style={{ fontSize: 11, color: 'var(--dim)', padding: '4px 0 8px' }}>No comments yet. Be the first.</div>
              )}
              {/* Comment input */}
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
                    background: 'var(--surface)', color: 'var(--ink)',
                    outline: 'none',
                  }}
                />
                <button onClick={submitComment} disabled={submitting || !newComment.trim()} className="sans" style={{
                  padding: '8px 14px', fontSize: 11, fontWeight: 700,
                  background: newComment.trim() ? 'var(--copper)' : 'var(--faint)',
                  color: newComment.trim() ? '#fff' : 'var(--dim)',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                }}>Post</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
