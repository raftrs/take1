'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate, showScore, savePlaylist } from '@/lib/utils'
import BackButton from '@/components/BackButton'

export default function VenuePage() {
  const { id } = useParams()
  const [venue, setVenue] = useState(null)
  const [notable, setNotable] = useState([])
  const [games, setGames] = useState([])
  const [showAllGames, setShowAllGames] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: v } = await supabase.from('venues').select('*').eq('id', id).single()
      if (!v) { setLoading(false); return }
      setVenue(v)
      const { data: ng } = await supabase.from('notable_games').select('id,title,game_date,away_team_abbr,home_team_abbr,away_score,home_score,sport,tier,game_id,collections')
        .eq('venue', v.venue_name).order('game_date', {ascending:false}).limit(20)
      setNotable(ng||[])
      const notableGameIds = (ng||[]).map(n => n.game_id).filter(Boolean)
      // FIX #52: Get more games. FIX #65: no home_score filter for golf
      let gq = supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,series_info,sport,title')
        .eq('venue', v.venue_name).order('game_date', {ascending:false}).limit(50)
      if (v.sport !== 'golf') gq = gq.gt('home_score', 0)
      const { data: gs } = await gq
      setGames((gs||[]).filter(g => !notableGameIds.includes(g.id)))
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="loading">Loading...</div>
  if (!venue) return <div className="empty">Venue not found</div>
  const label = {basketball:'NBA ARENA',football:'NFL STADIUM',golf:'GOLF COURSE'}[venue.sport]||'VENUE'
  const isGolf = venue.sport === 'golf'
  const displayGames = showAllGames ? games : games.slice(0, 10)

  return (
    <div>
      <BackButton/>
      <div style={{ padding:'24px 20px 16px', borderBottom:'2px solid var(--rule)' }}>
        <div className="sans" style={{ fontSize:9, color:'var(--copper)', letterSpacing:2.5, fontWeight:700, marginBottom:10 }}>{label}</div>
        <div style={{ fontSize:26, color:'var(--ink)', lineHeight:1.15 }}>{venue.venue_name}</div>
        <div style={{ fontSize:14, color:'var(--muted)', marginTop:6 }}>{venue.venue_city}</div>
      </div>

      <div style={{ display:'flex', borderBottom:'1px solid var(--faint)' }}>
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'14px 12px', cursor:'pointer', color:'var(--dim)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          <span className="sans" style={{ fontSize:11, fontWeight:600 }}>I&apos;ve been here</span>
        </div>
        <div style={{ width:1, background:'var(--faint)' }}></div>
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'14px 12px', cursor:'pointer', color:'var(--dim)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          <span className="sans" style={{ fontSize:11, fontWeight:600 }}>Want to visit</span>
        </div>
      </div>

      {(venue.capacity||venue.opened) && <div style={{ display:'flex', padding:'14px 20px', borderBottom:'1px solid var(--faint)' }}>
        {venue.capacity && <div style={{ flex:1, textAlign:'center', borderRight:venue.opened?'1px solid var(--faint)':'none' }}><div style={{ fontSize:22, color:'var(--ink)' }}>{venue.capacity.toLocaleString()}</div><div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:1.5, fontWeight:600, marginTop:2 }}>CAPACITY</div></div>}
        {venue.opened && <div style={{ flex:1, textAlign:'center' }}><div style={{ fontSize:22, color:'var(--ink)' }}>{venue.opened}</div><div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:1.5, fontWeight:600, marginTop:2 }}>OPENED</div></div>}
      </div>}

      {venue.description && <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.8, borderLeft:'3px solid var(--copper)', padding:'0 0 0 16px', margin:'16px 20px' }}>{venue.description}</div>}

      {notable.length > 0 && (() => {
        const allTimerGames = notable.filter(g => g.tier === 1)
        const superBowls = notable.filter(g => g.tier !== 1 && g.title?.includes('Super Bowl'))
        const otherNotable = notable.filter(g => g.tier !== 1 && !g.title?.includes('Super Bowl'))
        const allNotablePlaylist = notable.map(g => ({ href: `/notable/${g.id}`, title: g.title }))
        function handleNotableClick(g) {
          const idx = notable.findIndex(n => n.id === g.id)
          savePlaylist(allNotablePlaylist, idx >= 0 ? idx : 0)
        }
        return <>
          {allTimerGames.length > 0 && <><hr className="sec-rule" style={{marginTop:16}}/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
            <div className="sec-head">ALL-TIMERS HERE</div>
            {allTimerGames.map(g => <Link key={g.id} href={`/notable/${g.id}`} onClick={() => handleNotableClick(g)} className="game-row" style={{ padding:'10px 0' }}>
              <span className="at-badge-sm">&#9733; ALL-TIMER</span>
              <div style={{ fontSize:14, color:'var(--ink)', marginTop:4 }}>{g.title}</div>
              <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{formatDate(g.game_date)}</div>
            </Link>)}
          </div></>}
          {superBowls.length > 0 && <><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
            <div className="sec-head">SUPER BOWLS</div>
            {superBowls.map(g => <Link key={g.id} href={`/notable/${g.id}`} onClick={() => handleNotableClick(g)} className="game-row" style={{ padding:'10px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#013369" strokeWidth="1.5"><path d="M12 2L4 8v6l8 8 8-8V8z"/></svg>
                <span style={{ fontSize:14, color:'var(--ink)' }}>{g.title}</span>
              </div>
              <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2, marginLeft:22 }}>{formatDate(g.game_date)}</div>
            </Link>)}
          </div></>}
          {otherNotable.length > 0 && <><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
            <div className="sec-head">{isGolf ? 'NOTABLE TOURNAMENTS' : 'NOTABLE GAMES'}</div>
            {otherNotable.map(g => <Link key={g.id} href={`/notable/${g.id}`} onClick={() => handleNotableClick(g)} className="game-row" style={{ padding:'10px 0' }}>
              <div style={{ fontSize:14, color:'var(--ink)' }}>{g.title}</div>
              <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{formatDate(g.game_date)}</div>
              {Array.isArray(g.collections) && g.collections.length > 0 && <div className="sans" style={{ fontSize:9, color:'var(--copper)', marginTop:4, letterSpacing:0.5 }}>{g.collections.join(' \u00B7 ')}</div>}
            </Link>)}
          </div></>}
        </>
      })()}

      {games.length > 0 && <><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
        <div className="sec-head">{isGolf ? 'MAJORS HOSTED' : 'FROM THE ARCHIVES'}</div>
        {!isGolf && <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:-10, marginBottom:14 }}>Playoff and championship games</div>}
        {displayGames.map((g, idx) => <Link key={g.id} href={`/game/${g.id}`} onClick={() => {
          const playlist = games.map(gm => ({ href: `/game/${gm.id}`, title: isGolf ? gm.title : (showScore(gm) || `${gm.away_team_abbr} @ ${gm.home_team_abbr}`) }))
          savePlaylist(playlist, idx)
        }} className="game-row" style={{ padding:'10px 0' }}>
          {isGolf ? <div style={{ fontSize:14, color:'var(--ink)' }}>{g.title}</div> :
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}><span style={{ fontSize:14, color:'var(--ink)' }}>{showScore(g) || `${g.away_team_abbr} @ ${g.home_team_abbr}`}</span><span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{formatDate(g.game_date)}</span></div>}
          {isGolf && <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{formatDate(g.game_date)}</div>}
          {g.series_info && !isGolf && <div className="sans" style={{ fontSize:10, color:'var(--copper)', marginTop:2 }}>{g.series_info}</div>}
        </Link>)}
        {!showAllGames && games.length > 10 && <div className="box-toggle" onClick={() => setShowAllGames(true)} style={{ textAlign:'center', marginTop:8 }}>Show all {games.length} games &darr;</div>}
        {showAllGames && games.length > 10 && <div className="box-toggle" onClick={() => setShowAllGames(false)} style={{ textAlign:'center', marginTop:8 }}>Show fewer &uarr;</div>}
      </div></>}
      <div style={{ height:80 }}></div>
    </div>
  )
}
