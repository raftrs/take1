'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate, sportLabel, savePlaylist } from '@/lib/utils'
import BackButton from '@/components/BackButton'
import TopLogo from '@/components/TopLogo'
import PromptDeck from '@/components/PromptDeck'

export default function TeamPage() {
  const { id } = useParams()
  const [team, setTeam] = useState(null)
  const [notable, setNotable] = useState([])
  const [games, setGames] = useState([])
  const [players, setPlayers] = useState([])
  const [venueId, setVenueId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [story, setStory] = useState('')

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
        .eq('sport',sp).or(`home_team_abbr.eq.${abbr},away_team_abbr.eq.${abbr}`).order('game_date',{ascending:false}).limit(30)
      if (sp !== 'golf') gq = gq.gt('home_score', 0)
      const { data: gs } = await gq
      // Filter out games that already appear in the notable section
      const filtered = (gs||[]).filter(g => !notableGameIds.includes(g.id)).slice(0, 10)
      setGames(filtered)

      if (sp==='basketball') {
        const { data: bs } = await supabase.from('box_scores').select('player_name').eq('team_abbr',abbr).limit(500)
        if (bs?.length) {
          const names = [...new Set(bs.map(b=>b.player_name))]
          const { data: pls } = await supabase.from('players').select('id,player_name,ppg,rpg,apg,position')
            .in('player_name',names).not('ppg','is',null).order('career_points',{ascending:false}).limit(15)
          setPlayers(pls||[])
        }
      }
      if (t.arena) { const { data: v } = await supabase.from('venues').select('id').eq('venue_name',t.arena).limit(1); if (v?.[0]) setVenueId(v[0].id) }
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

      {notable.length > 0 && (() => {
        const allTimerGames = notable.filter(g => g.tier === 1)
        const otherNotable = notable.filter(g => g.tier !== 1)
        const allNotablePlaylist = notable.map(g => ({ href: `/notable/${g.id}`, title: g.title }))
        function handleNotableClick(g) {
          const idx = notable.findIndex(n => n.id === g.id)
          savePlaylist(allNotablePlaylist, idx >= 0 ? idx : 0)
        }
        return <>
          {allTimerGames.length > 0 && <><hr className="sec-rule" style={{marginTop:16}}/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
            <div className="sec-head">ALL-TIMERS</div>
            <div style={{ maxHeight:300, overflowY:'auto' }}>
              {allTimerGames.map(g => <Link key={g.id} href={`/notable/${g.id}`} onClick={() => handleNotableClick(g)} className="game-row" style={{ padding:'10px 0' }}>
                <span className="at-badge-sm">&#9733; ALL-TIMER</span>
                <div style={{ fontSize:14, color:'var(--ink)', marginTop:4 }}>{g.title}</div>
                <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{formatDate(g.game_date)}</div>
              </Link>)}
            </div>
          </div></>}
          {otherNotable.length > 0 && <><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
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

      <hr className="sec-rule"/><hr className="sec-rule-thin"/>
      <div style={{ padding:20 }}>
        <PromptDeck type="team" name={team.full_name || team.team_name} onSelect={(prompt) => setStory(prompt)} />
        <textarea className="story-textarea" style={{ marginTop:12 }} placeholder="Or write your own..." value={story} onChange={e => setStory(e.target.value)} />
      </div>

      {games.length > 0 && <><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
        <div className="sec-head">FROM THE ARCHIVES</div>
        <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:-10, marginBottom:14 }}>Playoff and championship games</div>
        {games.map((g, idx) => <Link key={g.id} href={`/game/${g.id}`} onClick={() => {
          const playlist = games.map(gm => ({ href: `/game/${gm.id}`, title: gm.sport === 'golf' ? gm.title : `${gm.away_team_abbr} ${gm.away_score} / ${gm.home_score} ${gm.home_team_abbr}` }))
          savePlaylist(playlist, idx)
        }} className="game-row" style={{ padding:'10px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <span style={{ fontSize:14, color:'var(--ink)' }}>{g.sport === 'golf' ? g.title : `${g.away_team_abbr} ${g.away_score} / ${g.home_score} ${g.home_team_abbr}`}</span>
            <span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{formatDate(g.game_date)}</span>
          </div>
          {g.series_info && <div className="sans" style={{ fontSize:10, color:'var(--copper)', marginTop:2 }}>{g.series_info}</div>}
        </Link>)}
      </div></>}

      {players.length > 0 && <><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
        <div className="sec-head">NOTABLE PLAYERS</div>
        <div className="perf-scroll">{players.map(p => <Link key={p.id} href={`/player/${p.id}`} className="perf-card" style={{ width:130, borderTopColor:color }}>
          <div className="perf-name">{p.player_name}</div><div className="perf-sub">{p.position}{p.ppg?` \u00B7 ${p.ppg} PPG`:''}</div>
        </Link>)}</div>
      </div></>}
      <div style={{ height:80 }}></div>
    </div>
  )
}
