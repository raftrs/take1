'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import FounderBadge from '@/components/FounderBadge'

export default function StoryComments({ userGameId }) {
  const [comments, setComments] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    async function loadCount() {
      const { count: c } = await supabase.from('story_comments')
        .select('id', { count: 'exact', head: true }).eq('user_game_id', userGameId)
      setCount(c || 0)
    }
    loadCount()
  }, [userGameId])

  async function loadComments() {
    const { data } = await supabase.from('story_comments')
      .select('id,user_id,comment,created_at')
      .eq('user_game_id', userGameId).order('created_at', { ascending: true }).limit(50)
    if (data?.length) {
      const uids = [...new Set(data.map(c => c.user_id))]
      const { data: profiles } = await supabase.from('profiles')
        .select('id,username,display_name,member_number').in('id', uids)
      const pMap = {}
      if (profiles) profiles.forEach(p => { pMap[p.id] = p })
      setComments(data.map(c => ({ ...c, profile: pMap[c.user_id] })))
    }
  }

  async function toggleExpand() {
    if (!expanded) await loadComments()
    setExpanded(!expanded)
  }

  async function submit() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('Sign in to comment'); return }
    if (!text.trim()) return
    setSending(true)
    await supabase.from('story_comments').insert({
      user_game_id: userGameId, user_id: user.id, comment: text.trim()
    })
    setText('')
    setSending(false)
    setCount(c => c + 1)
    await loadComments()
    setExpanded(true)
  }

  return (
    <div>
      <button onClick={toggleExpand} className="sans" style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 10, fontWeight: 600, color: 'var(--dim)',
        padding: '2px 0', display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {count > 0 ? `${count} repl${count === 1 ? 'y' : 'ies'}` : 'Reply'}
      </button>

      {expanded && (
        <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid var(--faint)' }}>
          {comments.map(c => (
            <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--faint)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Link href={`/user/${c.profile?.username || ''}`} className="sans" style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--copper)', textDecoration: 'none',
                }}>
                  {c.profile?.display_name || c.profile?.username || 'Fan'}
                </Link>
                <FounderBadge number={c.profile?.member_number} />
                <span className="sans" style={{ fontSize: 9, color: 'var(--dim)', marginLeft: 'auto' }}>
                  {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{c.comment}</div>
            </div>
          ))}

          {/* Input */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingBottom: 4 }}>
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="Write a reply..."
              style={{
                flex: 1, padding: '8px 10px', fontSize: 13,
                border: '1px solid var(--faint)', borderRadius: 4,
                background: 'var(--surface)', color: 'var(--ink)',
                fontFamily: "'Crete Round', Georgia, serif",
              }}
            />
            <button onClick={submit} disabled={sending || !text.trim()} className="sans" style={{
              padding: '8px 14px', fontSize: 10, fontWeight: 700,
              background: text.trim() ? 'var(--copper)' : 'var(--faint)',
              color: text.trim() ? '#fff' : 'var(--dim)',
              border: 'none', borderRadius: 4, cursor: 'pointer',
              letterSpacing: 0.5,
            }}>
              {sending ? '...' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
