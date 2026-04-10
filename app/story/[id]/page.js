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
  const authorMemberNum = author?.member_number && author.member_number <= 1000 ? author.member_number : null
  const isGolf = gameSport === 'golf'

  return (
    <div>
      <TopLogo />
      <BackButton />

      {/* Theatrical dark scoreboard */}
      {sc ? (
        <div style={{ position: 'relative' }}>
          <div className="scoreboard">
            <div className="sb-team">
              <div className="sb-abbr">{sc.away.abbr}</div>
              <div className={`sb-score${sc.away.won ? ' win' : ' lose'}`}>{sc.away.score}</div>
            </div>
            <div style={{ textAlign: 'center' }}><div className="sb-final">FINAL</div></div>
            <div className="sb-team">
              <div className="sb-abbr">{sc.home.abbr}</div>
              <div className={`sb-score${sc.home.won ? ' win' : ' lose'}`}>{sc.home.score}</div>
            </div>
          </div>
          <div className="sb-sub">
            {game?.series_info && <div><span className="sb-series">{game.series_info}</span></div>}
            <div>{formatDate(game?.game_date)} {game?.venue ? `\u00B7 ${game.venue}` : ''}</div>
          </div>
          <div className="sb-curtain"></div>
        </div>
      ) : (
        <div style={{ padding: '20px 24px', background: 'var(--surface)', borderTop: '2px solid var(--amber)', borderBottom: '1px solid var(--rule)' }}>
          {gameSport && <div style={{ marginBottom: 8 }}><SportBadge sport={gameSport} /></div>}
          <div style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--ink)', lineHeight: 1.3 }}>{gameTitle}</div>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
            {formatDate(game?.game_date || notable?.game_date)}
            {game?.venue ? ` \u00B7 ${game.venue}` : ''}
          </div>
          <div className="sb-curtain" style={{ marginTop: 16 }}></div>
        </div>
      )}

      {/* Link to game page */}
      <div style={{ padding: '10px 24px', textAlign: 'center', borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>
        <Link href={gameHref} style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--amber)', fontWeight: 600, textDecoration: 'none' }}>
          {notable?.title || gameTitle} &rarr;
        </Link>
      </div>

      {/* Author + story body */}
      <div style={{ padding: '32px 24px 36px', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--rule)' }}>
          {authorMemberNum ? <div className="avatar avatar-md" style={{background:"var(--amber)",color:"var(--gold)",border:"none",fontWeight:800}}>{authorMemberNum}</div> : <div className="avatar avatar-md">{authorInitial}</div>}
          <div>
            <div>
              <Link href={author?.username ? `/user/${author.username}` : '#'} style={{ textDecoration: 'none' }}>
                <span className="author-name" style={{ fontSize: 14 }}>{author?.display_name || author?.username || 'A fan'}</span>
              </Link>
              <FounderBadge number={author?.member_number} />
            </div>
            <div style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              {story.attended && <span className="attended-badge">WAS THERE</span>}
              {story.rating && <span style={{ color: 'var(--amber)', letterSpacing: 1 }}>{'★'.repeat(story.rating)}</span>}
              <span>\u00B7 {new Date(story.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Story text with drop cap */}
        <div className="story-full-text">
          {story.story.split('\n').filter(p => p.trim()).map((para, i) => (
            <p key={i} className={i === 0 ? 'story-drop-cap' : ''} style={i > 0 ? { marginTop: 18 } : {}}>{para}</p>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, paddingTop: 18, borderTop: '1px solid var(--rule)' }}>
          <HighFive userGameId={story.id} size={22} />
          <span className="timestamp">
            {new Date(story.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Conversation */}
      <div style={{ padding: '28px 24px 36px', background: 'var(--bg)', borderTop: '1px solid var(--rule)' }}>
        <div className="sec-head">{replies.length > 0 ? `Conversation (${replies.length})` : 'Start the conversation'}</div>

        {replies.map(r => {
          const ri = (r.profile?.display_name || r.profile?.username || '?')[0].toUpperCase()
          return (
            <div key={r.id} className="convo-item">
              <div className="avatar avatar-sm">{ri}</div>
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

        <div style={{ display: 'flex', gap: 10, marginTop: 20, alignItems: 'flex-end' }}>
          <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
            placeholder="Join the conversation..." rows={1}
            style={{
              flex: 1, padding: '12px 14px', fontFamily: 'var(--body)', fontSize: 14,
              color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--rule)',
              borderRadius: 4, outline: 'none', resize: 'none', minHeight: 44,
            }}
          />
          <button onClick={submitReply} disabled={sending || !replyText.trim()}
            className={`post-btn${replyText.trim() ? '' : ' off'}`}>
            {sending ? '...' : 'Reply'}
          </button>
        </div>
      </div>

      <div style={{ height: 80 }}></div>
    </div>
  )
}
