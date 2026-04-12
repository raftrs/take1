'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate, scoreWithWinner } from '@/lib/utils'
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
    } else { setReplies([]) }
  }

  async function submitReply() {
    if (!user) { alert('Sign in to reply'); return }
    if (!replyText.trim()) return
    setSending(true)
    await supabase.from('story_comments').insert({ user_game_id: parseInt(id), user_id: user.id, comment: replyText.trim() })
    setReplyText('')
    setSending(false)
    await loadReplies(parseInt(id))
  }

  if (loading) return <div className="loading">Loading...</div>
  if (!story) return <div className="empty">Story not found</div>

  const gameTitle = notable?.title || game?.title || (game ? `${game.away_team_abbr} ${game.away_score} / ${game.home_score} ${game.home_team_abbr}` : '')
  const gameHref = notable ? `/notable/${notable.id}` : `/game/${story.game_id}`
  const gameSport = notable?.sport || game?.sport
  const sc = game ? scoreWithWinner(game) : null
  const authorInitial = (author?.display_name || author?.username || '?')[0].toUpperCase()

  return (
    <div>
      <TopLogo />
      <BackButton />

      {/* Dark scoreboard header */}
      {sc ? (<>
        <div className="scoreboard">
          <div className="sb-team">
            <div className="sb-abbr">{sc.away.abbr}</div>
            <div className={`sb-score${!sc.away.won ? ' lose' : ''}`}>{sc.away.score}</div>
          </div>
          <div style={{ textAlign: 'center' }}><div className="sb-final">FINAL</div></div>
          <div className="sb-team">
            <div className="sb-abbr">{sc.home.abbr}</div>
            <div className={`sb-score${!sc.home.won ? ' lose' : ''}`}>{sc.home.score}</div>
          </div>
        </div>
        <div className="sb-sub">
          {formatDate(game?.game_date || notable?.game_date)}
          {game?.series_info ? ` \u00B7 ${game.series_info}` : ''}
          {game?.venue ? ` \u00B7 ${game.venue}` : ''}
        </div>
      </>) : (
        <div style={{ padding: '16px 20px' }}>
          {gameSport && <div style={{ marginBottom: 8 }}><SportBadge sport={gameSport} /></div>}
          <Link href={gameHref} style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: 22, color: 'var(--ink)', lineHeight: 1.3, fontFamily: 'var(--display)' }}>{gameTitle}</div>
          </Link>
          <div className="mono" style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>
            {formatDate(game?.game_date || notable?.game_date)}
            {game?.venue ? ` \u00B7 ${game.venue}` : ''}
          </div>
        </div>
      )}

      {/* If scoreboard shown, add link to game */}
      {sc && (
        <div style={{ padding: '8px 20px 0', textAlign: 'center' }}>
          <Link href={gameHref} className="mono" style={{ fontSize: 11, color: 'var(--copper)', fontWeight: 600 }}>
            {notable?.title || gameTitle} &rarr;
          </Link>
        </div>
      )}

      <hr className="sec-rule" style={{ marginTop: 16 }} /><hr className="sec-rule-thin" />

      {/* Author byline + story */}
      <div style={{ padding: '24px 20px 28px', background: 'var(--surface)' }}>
        <div className="story-page-byline">
          <div className="avatar avatar-lg" style={{ width: 36, height: 36, fontSize: 14 }}>{authorInitial}</div>
          <div>
            <Link href={author?.username ? `/user/${author.username}` : '#'} style={{ textDecoration: 'none' }}>
              <span className="author-name" style={{ fontSize: 14 }}>{author?.display_name || author?.username || 'A fan'}</span>
            </Link>
            <FounderBadge number={author?.member_number} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              {story.rating && <span className="stars">{[1,2,3,4,5].map(i => <span key={i} className={`s${i <= story.rating ? ' on' : ''}`}>&#9733;</span>)}</span>}
              {story.attended && <span className="mono" style={{ fontSize: 9, color: 'var(--copper)', fontWeight: 700, letterSpacing: 0.5, padding: '2px 6px', border: '1px solid var(--copper)', borderRadius: 2 }}>WAS THERE</span>}
            </div>
          </div>
        </div>

        <div className="story-text-full">
          <p>{story.story}</p>
        </div>

        <div className="story-page-foot">
          <HighFive userGameId={story.id} />
          <span className="timestamp">
            {new Date(story.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Conversation */}
      <hr className="sec-rule" /><hr className="sec-rule-thin" />
      <div style={{ padding: 20 }}>
        <div className="sec-head">{replies.length > 0 ? `CONVERSATION (${replies.length})` : 'START THE CONVERSATION'}</div>

        {replies.map(r => {
          const ri = (r.profile?.display_name || r.profile?.username || '?')[0].toUpperCase()
          return (
            <div key={r.id} className="convo-item">
              <div className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{ri}</div>
              <div style={{ flex: 1 }}>
                <div>
                  <Link href={`/user/${r.profile?.username || ''}`} style={{ textDecoration: 'none' }}>
                    <span className="convo-name">{r.profile?.display_name || r.profile?.username || 'Fan'}</span>
                  </Link>
                  <FounderBadge number={r.profile?.member_number} />
                  <span className="timestamp" style={{ marginLeft: 8 }}>
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  {user && r.user_id === user.id && (
                    <button onClick={async () => { await supabase.from('story_comments').delete().eq('id', r.id); setReplies(replies.filter(x => x.id !== r.id)) }}
                      className="action-btn" style={{ marginLeft: 8, fontSize: 9 }}>Delete</button>
                  )}
                </div>
                <div className="convo-body">{r.comment}</div>
              </div>
            </div>
          )
        })}

        {/* Reply input */}
        <div className="convo-write">
          <div style={{ flex: 1 }}>
            <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
              placeholder="Add to the conversation..." rows={3}
              className="story-textarea" style={{ background: 'var(--surface)', width: '100%' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={submitReply} disabled={sending || !replyText.trim()} className={`post-btn${replyText.trim() ? '' : ' off'}`}>
            {sending ? 'Posting...' : 'Reply'}
          </button>
        </div>
      </div>

      <div style={{ height: 80 }}></div>
    </div>
  )
}
