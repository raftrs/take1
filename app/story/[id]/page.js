'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import BackButton from '@/components/BackButton'
import TopLogo from '@/components/TopLogo'
import SportBadge from '@/components/SportBadge'
import HighFive from '@/components/HighFive'
import FounderBadge from '@/components/FounderBadge'

export default function StoryPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [story, setStory] = useState(null)
  const [game, setGame] = useState(null)
  const [notable, setNotable] = useState(null)
  const [author, setAuthor] = useState(null)
  const [replies, setReplies] = useState([])
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: s } = await supabase.from('user_games')
        .select('id,user_id,story,rating,attended,created_at,game_id')
        .eq('id', id).single()
      if (!s || !s.story) { setLoading(false); return }
      setStory(s)

      const { data: p } = await supabase.from('profiles')
        .select('id,username,display_name,city,member_number').eq('id', s.user_id).single()
      setAuthor(p)

      if (s.game_id) {
        const { data: g } = await supabase.from('games')
          .select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,sport,title,venue,series_info')
          .eq('id', s.game_id).single()
        if (g) setGame(g)
        const { data: n } = await supabase.from('notable_games')
          .select('id,title,sport,game_date,tier').eq('game_id', s.game_id).limit(1)
        if (n?.[0]) setNotable(n[0])
      }

      await loadReplies(s.id)
      setLoading(false)
    }
    load()
  }, [id])

  async function loadReplies(sid) {
    const { data } = await supabase.from('story_comments')
      .select('id,user_id,comment,created_at')
      .eq('user_game_id', sid).order('created_at', { ascending: true })
    if (data?.length) {
      const uids = [...new Set(data.map(c => c.user_id))]
      const { data: profs } = await supabase.from('profiles')
        .select('id,username,display_name,member_number').in('id', uids)
      const pm = {}; if (profs) profs.forEach(p => { pm[p.id] = p })
      setReplies(data.map(c => ({ ...c, profile: pm[c.user_id] })))
    } else {
      setReplies([])
    }
  }

  async function submitReply() {
    if (!user) { alert('Sign in to reply'); return }
    if (!replyText.trim()) return
    setSending(true)
    await supabase.from('story_comments').insert({
      user_game_id: parseInt(id), user_id: user.id, comment: replyText.trim()
    })
    setReplyText('')
    setSending(false)
    await loadReplies(parseInt(id))
  }

  if (loading) return <div className="loading">Loading...</div>
  if (!story) return <div className="empty">Story not found</div>

  const gameTitle = notable?.title || game?.title || (game ? `${game.away_team_abbr} ${game.away_score} / ${game.home_score} ${game.home_team_abbr}` : '')
  const gameHref = notable ? `/notable/${notable.id}` : `/game/${story.game_id}`
  const gameSport = notable?.sport || game?.sport

  return (
    <div>
      <TopLogo />
      <BackButton />

      {/* Game context */}
      <div style={{ padding: '0 20px', marginTop: 12 }}>
        {gameSport && <div style={{ marginBottom: 8 }}><SportBadge sport={gameSport} /></div>}
        <Link href={gameHref} style={{ textDecoration: 'none' }}>
          <div style={{ fontSize: 22, color: 'var(--ink)', lineHeight: 1.3 }}>{gameTitle}</div>
        </Link>
        <div className="sans" style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6, lineHeight: 1.6 }}>
          {formatDate(game?.game_date || notable?.game_date)}
          {game?.series_info ? ` \u00B7 ${game.series_info}` : ''}
          {game?.venue ? ` \u00B7 ${game.venue}` : ''}
        </div>
      </div>

      <hr className="sec-rule" style={{ marginTop: 20 }} /><hr className="sec-rule-thin" />

      {/* Author + story */}
      <div style={{ padding: '24px 20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link href={author?.username ? `/user/${author.username}` : '#'} style={{ textDecoration: 'none', fontSize: 15, color: 'var(--copper)', fontWeight: 600 }}>
              {author?.display_name || author?.username || 'A fan'}
            </Link>
            <FounderBadge number={author?.member_number} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {story.attended && <span className="sans" style={{ fontSize: 9, color: 'var(--copper)', fontWeight: 600, letterSpacing: 0.5, padding: '2px 6px', border: '1px solid var(--copper)', borderRadius: 2 }}>WAS THERE</span>}
            {story.rating && <span style={{ fontSize: 14, color: 'var(--gold)' }}>{'★'.repeat(story.rating)}</span>}
          </div>
        </div>

        <div style={{ fontSize: 17, color: 'var(--text)', lineHeight: 2 }}>
          {story.story}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--faint)' }}>
          <HighFive userGameId={story.id} />
          <div className="sans" style={{ fontSize: 10, color: 'var(--dim)' }}>
            {new Date(story.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Replies */}
      <hr className="sec-rule" /><hr className="sec-rule-thin" />
      <div style={{ padding: 20 }}>
        <div className="sec-head">{replies.length > 0 ? `CONVERSATION (${replies.length})` : 'START THE CONVERSATION'}</div>

        {replies.map(r => (
          <div key={r.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--faint)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Link href={`/user/${r.profile?.username || ''}`} style={{ textDecoration: 'none', fontSize: 13, fontWeight: 600, color: 'var(--copper)' }}>
                  {r.profile?.display_name || r.profile?.username || 'Fan'}
                </Link>
                <FounderBadge number={r.profile?.member_number} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="sans" style={{ fontSize: 10, color: 'var(--dim)' }}>
                  {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                {user && r.user_id === user.id && (
                  <button onClick={async () => { await supabase.from('story_comments').delete().eq('id', r.id); setReplies(replies.filter(x => x.id !== r.id)) }}
                    className="sans" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: 'var(--dim)' }}>Delete</button>
                )}
              </div>
            </div>
            <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.8 }}>{r.comment}</div>
          </div>
        ))}

        {/* Reply input */}
        <div style={{ marginTop: 20 }}>
          <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
            placeholder="Add to the conversation..." rows={3}
            style={{
              width: '100%', padding: '14px', fontSize: 15,
              border: '1px solid var(--faint)', borderRadius: 0,
              borderLeft: '3px solid var(--copper)',
              background: 'var(--surface)', color: 'var(--ink)',
              fontFamily: "'Crete Round', Georgia, serif", lineHeight: 1.8, resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button onClick={submitReply} disabled={sending || !replyText.trim()} className="sans" style={{
              padding: '10px 24px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
              background: replyText.trim() ? 'var(--copper)' : 'var(--faint)',
              color: replyText.trim() ? '#fff' : 'var(--dim)',
              border: 'none', cursor: replyText.trim() ? 'pointer' : 'default',
            }}>
              {sending ? 'Posting...' : 'Reply'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: 80 }}></div>
    </div>
  )
}
