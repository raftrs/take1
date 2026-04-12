'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { formatDate, sportLabel, scoreWithWinner, savePlaylist, isPlayoff } from '@/lib/utils'
import BackButton from '@/components/BackButton'
import TopLogo from '@/components/TopLogo'


export default function TeamPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [team, setTeam] = useState(null)
  const [notable, setNotable] = useState([])
  const [games, setGames] = useState([])
  const [venueId, setVenueId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [story, setStory] = useState('')
  const [storySaving, setStorySaving] = useState(false)
  const [storySaved, setStorySaved] = useState(false)
  const [fanNotes, setFanNotes] = useState([])
  const [archiveSort, setArchiveSort] = useState('desc')
  const [showAllArchives, setShowAllArchives] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [retiredNumbers, setRetiredNumbers] = useState([])

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase.from('teams').select('*').eq('id', id).single()
      if (!t) { setLoading(false); return }
      setTeam(t)
      const abbr = t.team_abbr||t.abbreviation, sp = t.sport||'basketball'

      const { data: ng } = await supabase.from('notable_games').select('id,title,game_date,away_team_abbr,home_team_abbr,away_score,home_score,tier,game_id,collections')
        .eq('sport',sp).or(`home_team_abbr.eq.${abbr},away_team_abbr.eq.${abbr}`).order('game_date',{ascending:false}).limit(10)
      setNotable(ng||[])

      // Get game_ids from notables so we can exclude them from archives
      const notableGameIds = (ng||[]).map(n => n.game_id).filter(Boolean)

      let gq = supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,series_info,sport')
        .eq('sport',sp).or(`home_team_abbr.eq.${abbr},away_team_abbr.eq.${abbr}`)
        .not('series_info', 'is', null).order('game_date',{ascending:false}).limit(200)
      if (sp !== 'golf') gq = gq.gt('home_score', 0)
      const { data: gs } = await gq
      // Filter out regular season + games that appear in notable section
      const filtered = (gs||[]).filter(g => isPlayoff(g.series_info) && !notableGameIds.includes(g.id))
      setGames(filtered)

      if (t.arena) { const { data: v } = await supabase.from('venues').select('id').eq('venue_name',t.arena).limit(1); if (v?.[0]) setVenueId(v[0].id) }
      // Fetch retired numbers
      const { data: rn } = await supabase.from('retired_numbers').select('*').eq('team_id', t.id).order('number')
      setRetiredNumbers(rn || [])
      // Check if user has this team favorited
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('favorite_teams').eq('id', user.id).single()
        const favs = prof?.favorite_teams || []
        const abbr = t.team_abbr||t.abbreviation
        if (favs.includes(t.id) || favs.includes(abbr)) setIsFavorite(true)
      }
      // Fetch fan notes
      const { data: notes } = await supabase.from('fan_notes').select('id,note,created_at,user_id').eq('entity_type', 'team').eq('entity_id', id).order('created_at', { ascending: false }).limit(20)
      if (notes?.length) {
        const uids = [...new Set(notes.map(n => n.user_id))]
        const { data: profs } = await supabase.from('profiles').select('id,username,display_name').in('id', uids)
        const pMap = {}; (profs||[]).forEach(p => { pMap[p.id] = p })
        setFanNotes(notes.map(n => ({ ...n, profile: pMap[n.user_id] })))
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="loading">Loading...</div>
  if (!team) return <div className="empty">Team not found</div>
  const color=team.primary_color||'var(--copper)', color2=team.secondary_color||color, ch=team.championships||0, sp=team.sport||'basketball'

  return (
    <div>
      <TopLogo />
      <BackButton/>
      <div style={{ borderBottom:'2px solid var(--rule)' }}>
        <div style={{ height:4, background:`linear-gradient(90deg,${color} 60%,${color2} 100%)` }}></div>
        <div style={{ padding:20 }}>
          <div className="sans" style={{ fontSize:9, color:'var(--copper)', letterSpacing:2.5, fontWeight:700, marginBottom:6 }}>
            <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:color, marginRight:6, verticalAlign:'middle' }}></span>
            {sportLabel(sp)} {team.conference?`\u00B7 ${team.conference.toUpperCase()} CONFERENCE`:''}
          </div>
          <div style={{ fontSize:26, color:'var(--ink)', lineHeight:1.15 }}>{team.full_name||`${team.city} ${team.team_name||team.name}`}</div>
        </div>
      </div>

      {ch > 0 && <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--faint)' }}>
        <div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:2, fontWeight:600, marginBottom:10 }}>CHAMPIONSHIPS</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
          {(team.championship_years || '').split(',').map(y => y.trim()).filter(Boolean).sort((a,b) => parseInt(a) - parseInt(b)).map((year, i) => {
            const isSupersonics = team.team_abbr === 'OKC' && year === '1979'
            const bannerColor = isSupersonics ? '#00653A' : color
            return <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ width:28, height:38, background:bannerColor, clipPath:'polygon(0 0,100% 0,100% 85%,50% 100%,0 85%)' }}></div>
              <div className="sans" style={{ fontSize:8, color:'var(--dim)', marginTop:3, fontWeight:600 }}>{year}</div>
            </div>
          })}
        </div>
        <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:8, textAlign:'center' }}>{ch} championship{ch!==1?'s':''}</div>
      </div>}

      {team.arena && (venueId ? <Link href={`/venue/${venueId}`} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderBottom:'1px solid var(--faint)', textDecoration:'none', color:'inherit' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--copper)" strokeWidth="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
        <div style={{ fontSize:13, color:'var(--ink)' }}>{team.arena}</div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5" style={{ marginLeft:'auto' }}><path d="M9 18l6-6-6-6"/></svg>
      </Link> : <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--faint)', fontSize:13, color:'var(--muted)' }}>{team.arena}</div>)}

      {team.description && <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.8, borderLeft:`3px solid ${color}`, padding:'0 0 0 16px', margin:'16px 20px' }}>{team.description}</div>}

      {/* Favorite team toggle */}
      <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--faint)' }}>
        <button onClick={async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) { alert('Sign in to add favorite teams'); return }
          const { data: prof } = await supabase.from('profiles').select('favorite_teams').eq('id', user.id).single()
          const current = prof?.favorite_teams || []
          const teamId = team.id
          const abbr = team.team_abbr||team.abbreviation
          let updated
          if (isFavorite) {
            // Remove both ID and abbr formats
            updated = current.filter(x => x !== teamId && x !== abbr)
          } else {
            updated = [...current, teamId]
          }
          await supabase.from('profiles').update({ favorite_teams: updated }).eq('id', user.id)
          setIsFavorite(!isFavorite)
        }} className="sans" style={{
          display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', fontSize:12, fontWeight:600,
          border: isFavorite ? `1.5px solid ${color}` : '1.5px solid var(--faint)', borderRadius:4, cursor:'pointer',
          background: isFavorite ? `${color}15` : 'transparent', color: isFavorite ? color : 'var(--dim)',
          transition:'all 0.2s'
        }}>
          {isFavorite ? '\u2605' : '\u2606'} {isFavorite ? 'Favorited' : 'Add to My Teams'}
        </button>
      </div>

      {notable.length > 0 && (() => {
        const allTimerGames = notable.filter(g => g.tier === 1)
        const otherNotable = notable.filter(g => g.tier !== 1)
        const allNotablePlaylist = notable.map(g => ({ href: `/notable/${g.id}`, title: g.title }))
        function handleNotableClick(g) {
          const idx = notable.findIndex(n => n.id === g.id)
          savePlaylist(allNotablePlaylist, idx >= 0 ? idx : 0)
        }
        return <>
          {allTimerGames.length > 0 && <><hr className="sec-rule" style={{marginTop:16}}/><div style={{ padding:20 }}>
            <div className="sec-head">ALL-TIMERS</div>
            <div style={{ maxHeight:300, overflowY:'auto' }}>
              {allTimerGames.map(g => <Link key={g.id} href={`/notable/${g.id}`} onClick={() => handleNotableClick(g)} className="game-row" style={{ padding:'10px 0' }}>
                <span className="at-badge-sm">&#9733; ALL-TIMER</span>
                <div style={{ fontSize:14, color:'var(--ink)', marginTop:4 }}>{g.title}</div>
                <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{formatDate(g.game_date)}</div>
              </Link>)}
            </div>
          </div></>}
          {otherNotable.length > 0 && <><hr className="sec-rule"/><div style={{ padding:20 }}>
            <div className="sec-head">{sp === 'golf' ? 'NOTABLE TOURNAMENTS' : 'NOTABLE GAMES'}</div>
            <div style={{ maxHeight:300, overflowY:'auto' }}>
              {otherNotable.map(g => <Link key={g.id} href={`/notable/${g.id}`} onClick={() => handleNotableClick(g)} className="game-row" style={{ padding:'10px 0' }}>
                <div style={{ fontSize:14, color:'var(--ink)' }}>{g.title}</div>
                <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{formatDate(g.game_date)}</div>
                {Array.isArray(g.collections) && g.collections.length > 0 && <div className="sans" style={{ fontSize:9, color:'var(--copper)', marginTop:4, letterSpacing:0.5 }}>{g.collections.join(' \u00B7 ')}</div>}
              </Link>)}
            </div>
          </div></>}
        </>
      })()}

      {retiredNumbers.length > 0 && <><hr className="sec-rule"/><div style={{ padding:20 }}>
        <div className="sec-head">RETIRED NUMBERS</div>
        <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:8, WebkitOverflowScrolling:'touch' }}>
          {retiredNumbers.map(rn => (
            <div key={rn.id} style={{
              minWidth:64, textAlign:'center', padding:'12px 8px 10px',
              background:'var(--surface)', border:'1px solid var(--faint)',
              borderTop:`3px solid ${color}`, flexShrink:0
            }}>
              <div style={{ fontFamily:'var(--display)', fontSize:22, color: color, lineHeight:1, fontWeight:600 }}>{rn.number}</div>
              <div className="sans" style={{ fontSize:8, color:'var(--ink)', marginTop:6, fontWeight:600, lineHeight:1.3 }}>{rn.player_name}</div>
              {rn.years_active && <div className="sans" style={{ fontSize:7, color:'var(--dim)', marginTop:3 }}>{rn.years_active}</div>}
            </div>
          ))}
        </div>
      </div></>}

      <hr className="sec-rule"/>
      <div style={{ padding:20 }}>
        <div className="sec-head">SAY SOMETHING ABOUT THE {(team.full_name || team.team_name).toUpperCase()}</div>
        <div style={{ fontFamily:'var(--ui)', fontSize:11, color:'var(--dim)', marginBottom:12, lineHeight:1.6, fontStyle:'italic' }}>Favorite players who have worn the jersey. Games you'll never forget. The best seasons. The most disappointing moments.</div>
        <textarea className="story-textarea" placeholder={`Say something about the ${team.full_name || team.team_name}...`} value={story} onChange={e => setStory(e.target.value)} />
        <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:10 }}>
          <button onClick={async () => {
            if (!user || !story.trim()) return
            setStorySaving(true)
            await supabase.from('fan_notes').insert({ user_id: user.id, entity_type: 'team', entity_id: parseInt(id), note: story.trim() })
            setStorySaved(true); setStorySaving(false)
            const newNote = { id: Date.now(), note: story.trim(), created_at: new Date().toISOString(), user_id: user.id, profile: { username: user.user_metadata?.username, display_name: user.user_metadata?.display_name } }
            setFanNotes(prev => [newNote, ...prev])
            setTimeout(() => { setStory(''); setStorySaved(false) }, 1500)
          }} disabled={!user || !story.trim() || storySaving} className={`post-btn${user && story.trim() ? '' : ' off'}`}>
            {storySaving ? 'Posting...' : storySaved ? 'Posted!' : 'Post'}
          </button>
          {!user && <span style={{ fontFamily:'var(--ui)', fontSize:10, color:'var(--dim)' }}>Sign in to post</span>}
        </div>
        {fanNotes.length > 0 && <div style={{ marginTop:20 }}>
          {fanNotes.map(n => (
            <div key={n.id} className="fan-note">
              <div className="fan-note-text">{n.note}</div>
              <div className="fan-note-meta">{n.profile?.display_name || n.profile?.username || 'Fan'} &middot; {formatDate(n.created_at?.split('T')[0])}</div>
            </div>
          ))}
        </div>}
      </div>

      {games.length > 0 && <><hr className="sec-rule"/><div style={{ padding:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div className="sec-head" style={{ marginBottom:0 }}>FROM THE ARCHIVES ({games.length})</div>
          <div style={{ display:'flex', gap:0 }}>
            {['Recent','Oldest'].map(s => <button key={s} onClick={() => setArchiveSort(s==='Recent'?'desc':'asc')} className="sans" style={{ padding:'3px 10px', fontSize:10, fontWeight:600, background:'none', border:'none', cursor:'pointer', color:(s==='Recent'?'desc':'asc')===archiveSort?'var(--copper)':'var(--dim)', borderBottom:(s==='Recent'?'desc':'asc')===archiveSort?'2px solid var(--copper)':'2px solid transparent' }}>{s}</button>)}
          </div>
        </div>
        <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginBottom:14 }}>Playoff Games</div>
        {(() => {
          const sorted = [...games].sort((a,b) => archiveSort==='desc' ? (b.game_date||'').localeCompare(a.game_date||'') : (a.game_date||'').localeCompare(b.game_date||''))
          const display = showAllArchives ? sorted : sorted.slice(0, 20)
          return <>
            {display.map((g, idx) => { const sw = scoreWithWinner(g); return <Link key={g.id} href={`/game/${g.id}`} onClick={() => {
              const playlist = sorted.map(gm => ({ href: `/game/${gm.id}`, title: gm.sport === 'golf' ? gm.title : `${gm.away_team_abbr} ${gm.away_score} / ${gm.home_score} ${gm.home_team_abbr}` }))
              savePlaylist(playlist, idx)
            }} className="game-row" style={{ padding:'10px 0' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                {sw ? <span style={{ fontSize:14 }}><span style={{ color: sw.away.won ? 'var(--ink)' : 'var(--dim)', fontWeight: sw.away.won ? 700 : 400 }}>{sw.away.abbr} {sw.away.score}</span><span style={{ color:'var(--dim)' }}> / </span><span style={{ color: sw.home.won ? 'var(--ink)' : 'var(--dim)', fontWeight: sw.home.won ? 700 : 400 }}>{sw.home.score} {sw.home.abbr}</span></span>
                  : <span style={{ fontSize:14, color:'var(--ink)' }}>{g.title || `${g.away_team_abbr} @ ${g.home_team_abbr}`}</span>}
                <span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{formatDate(g.game_date)}</span>
              </div>
              {g.series_info && <div className="sans" style={{ fontSize:10, color:'var(--copper)', marginTop:2 }}>{g.series_info}</div>}
            </Link>})}
            {sorted.length > 20 && (
              <div onClick={() => setShowAllArchives(!showAllArchives)} className="sans" style={{ textAlign:'center', marginTop:10, fontSize:11, color:'var(--copper)', cursor:'pointer', fontWeight:600 }}>
                {showAllArchives ? 'Show fewer' : `See all ${sorted.length} games`}
              </div>
            )}
          </>
        })()}
      </div></>}
      <div style={{ height:80 }}></div>
    </div>
  )
}
