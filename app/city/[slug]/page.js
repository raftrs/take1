'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate, sportLabel, showScore, CITY_MAP, savePlaylist, isPlayoff } from '@/lib/utils'
import BackButton from '@/components/BackButton'
import SportBadge from '@/components/SportBadge'
import TopLogo from '@/components/TopLogo'


// Reverse lookup: given a primary city, find all suburb venue_city values that map to it
function getSuburbs(primary) {
  const suburbs = [primary]
  Object.entries(CITY_MAP).forEach(([suburb, city]) => {
    if (city === primary) suburbs.push(suburb)
  })
  return suburbs
}

export default function CityPage() {
  const { slug } = useParams()
  const cityName = decodeURIComponent(slug)
  const [teams, setTeams] = useState([])
  const [venues, setVenues] = useState([])
  const [allTimers, setAllTimers] = useState([])
  const [games, setGames] = useState([])
  const [showAllGames, setShowAllGames] = useState(false)
  const [loading, setLoading] = useState(true)
  const [story, setStory] = useState('')
  const [archiveSort, setArchiveSort] = useState('desc')

  useEffect(() => {
    async function load() {
      // All venue_city values that belong to this city (primary + suburbs)
      const suburbs = getSuburbs(cityName)
      // Strip state portion from suburb names to avoid commas breaking Supabase OR filters
      const searchTerms = [...new Set(suburbs.map(s => s.split(',')[0].trim()))]

      // Teams: match on city field
      const { data: tm } = await supabase.from('teams').select('id,team_abbr,team_name,full_name,sport,primary_color,secondary_color,championships,arena')
        .eq('active', true).ilike('city', `%${cityName}%`).order('sport')
      setTeams(tm || [])

      // Venues: match on any search term (primary city + suburb city names)
      const venueFilters = searchTerms.map(s => `venue_city.ilike.%${s}%`).join(',')
      const { data: vn } = await supabase.from('venues').select('id,venue_name,venue_city,sport,description')
        .or(venueFilters).order('venue_name')
      setVenues(vn || [])

      // Get venue names for game/notable queries
      const venueNames = (vn || []).map(v => v.venue_name)

      // Get team abbreviations for this city
      const teamAbbrs = (tm || []).map(t => t.team_abbr).filter(Boolean)

      // All-Timers: by venue name, venue_city, OR team abbreviation
      const atResults = []
      if (venueNames.length > 0) {
        const { data: at } = await supabase.from('notable_games').select('id,title,game_date,sport,tier,venue')
          .eq('tier', 1).in('venue', venueNames).order('game_date', { ascending: false })
        if (at) at.forEach(g => { if (!atResults.find(m => m.id === g.id)) atResults.push(g) })
      }
      if (teamAbbrs.length > 0) {
        for (const abbr of teamAbbrs) {
          const { data: at2 } = await supabase.from('notable_games').select('id,title,game_date,sport,tier,venue')
            .eq('tier', 1).or(`home_team_abbr.eq.${abbr},away_team_abbr.eq.${abbr}`).order('game_date', { ascending: false }).limit(20)
          if (at2) at2.forEach(g => { if (!atResults.find(m => m.id === g.id)) atResults.push(g) })
        }
      }
      atResults.sort((a, b) => (b.game_date || '').localeCompare(a.game_date || ''))
      setAllTimers(atResults)

      // Games: by venue name, venue_city, OR team abbreviation - PLAYOFF ONLY
      let allGames = []
      if (venueNames.length > 0) {
        const { data: gs } = await supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,venue,series_info,sport,title')
          .in('venue', venueNames).not('series_info', 'is', null).order('game_date', { ascending: false }).limit(50)
        if (gs) allGames = gs
      }
      // Also grab games by venue_city
      const vcGameFilters = searchTerms.map(s => `venue_city.ilike.%${s}%`).join(',')
      const { data: gs2 } = await supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,venue,series_info,sport,title')
        .or(vcGameFilters).not('series_info', 'is', null).order('game_date', { ascending: false }).limit(50)
      if (gs2) gs2.forEach(g => { if (!allGames.find(m => m.id === g.id)) allGames.push(g) })
      // Also grab home games for local teams
      if (teamAbbrs.length > 0) {
        for (const abbr of teamAbbrs) {
          const { data: gs3 } = await supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,venue,series_info,sport,title')
            .eq('home_team_abbr', abbr).not('series_info', 'is', null).order('game_date', { ascending: false }).limit(30)
          if (gs3) gs3.forEach(g => { if (!allGames.find(m => m.id === g.id)) allGames.push(g) })
        }
      }
      allGames = allGames.filter(g => isPlayoff(g.series_info))
      allGames.sort((a, b) => (b.game_date || '').localeCompare(a.game_date || ''))
      setGames(allGames)

      setLoading(false)
    }
    load()
  }, [cityName])

  if (loading) return <div className="loading">Loading...</div>
  const empty = teams.length === 0 && venues.length === 0 && allTimers.length === 0 && games.length === 0
  if (empty) return <div><BackButton /><div className="empty">No data found for {cityName}. Try searching for a specific team or venue.</div></div>

  const displayGames = showAllGames ? games : games.slice(0, 15)

  return (
    <div>
      <TopLogo />
      <BackButton />
      <div style={{ padding:'24px 20px 16px', borderBottom:'2px solid var(--rule)' }}>
        <div className="sans" style={{ fontSize:9, color:'var(--copper)', letterSpacing:2.5, fontWeight:700, marginBottom:6 }}>CITY</div>
        <div style={{ fontSize:26, color:'var(--ink)', lineHeight:1.15 }}>{cityName}</div>
        <div className="sans" style={{ fontSize:11, color:'var(--dim)', marginTop:6 }}>
          {teams.length > 0 && `${teams.length} team${teams.length !== 1 ? 's' : ''}`}
          {teams.length > 0 && venues.length > 0 && ' \u00B7 '}
          {venues.length > 0 && `${venues.length} venue${venues.length !== 1 ? 's' : ''}`}
          {(teams.length > 0 || venues.length > 0) && games.length > 0 && ' \u00B7 '}
          {games.length > 0 && `${games.length} game${games.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* TEAMS */}
      {teams.length > 0 && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
        <div className="sec-head">TEAMS</div>
        {teams.map(t => {
          const color = t.primary_color || 'var(--copper)'
          return <Link key={t.id} href={`/team/${t.id}`} className="game-row" style={{ padding:'12px 0', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:color, flexShrink:0 }}></div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, color:'var(--ink)' }}>{t.full_name}</div>
              <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>
                {sportLabel(t.sport)}{t.championships ? ` \u00B7 ${t.championships} championship${t.championships !== 1 ? 's' : ''}` : ''}
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5"><path d="M9 18l6-6-6-6"/></svg>
          </Link>
        })}
      </div></>)}

      {/* VENUES */}
      {venues.length > 0 && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
        <div className="sec-head">VENUES</div>
        {venues.map(v => <Link key={v.id} href={`/venue/${v.id}`} className="game-row" style={{ padding:'10px 0', display:'flex', alignItems:'center', gap:10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--copper)" strokeWidth="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, color:'var(--ink)' }}>{v.venue_name}</div>
            <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:1 }}>{v.venue_city}{v.sport ? ` \u00B7 ${sportLabel(v.sport)}` : ''}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5"><path d="M9 18l6-6-6-6"/></svg>
        </Link>)}
      </div></>)}

      {/* ALL-TIMERS */}
      {allTimers.length > 0 && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
        <div className="sec-head">{cityName.toUpperCase()} ALL-TIMERS</div>
        {allTimers.map((g, idx) => <Link key={g.id} href={`/notable/${g.id}`} onClick={() => {
          const playlist = allTimers.map(a => ({ href: `/notable/${a.id}`, title: a.title }))
          savePlaylist(playlist, idx)
        }} className="game-row" style={{ padding:'10px 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span className="at-badge-sm">&#9733; ALL-TIMER</span>
            <SportBadge sport={g.sport}/>
          </div>
          <div style={{ fontSize:14, color:'var(--ink)', marginTop:4 }}>{g.title}</div>
          <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{formatDate(g.game_date)}{g.venue ? ` \u00B7 ${g.venue}` : ''}</div>
        </Link>)}
      </div></>)}

      {teams.length >= 2 && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/>
      <div style={{ padding:20 }}>
        <div className="sec-head">SAY SOMETHING</div>
        <textarea className="story-textarea" placeholder={`Say something about ${cityName}...`} value={story} onChange={e => setStory(e.target.value)} />
      </div></>)}

      {/* GAMES */}
      {games.length > 0 && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div className="sec-head" style={{ marginBottom:0 }}>FROM THE ARCHIVES</div>
          <div style={{ display:'flex', gap:0 }}>
            {['Recent','Oldest'].map(s => <button key={s} onClick={() => setArchiveSort(s==='Recent'?'desc':'asc')} className="sans" style={{ padding:'3px 10px', fontSize:10, fontWeight:600, background:'none', border:'none', cursor:'pointer', color:(s==='Recent'?'desc':'asc')===archiveSort?'var(--copper)':'var(--dim)', borderBottom:(s==='Recent'?'desc':'asc')===archiveSort?'2px solid var(--copper)':'2px solid transparent' }}>{s}</button>)}
          </div>
        </div>
        <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginBottom:14 }}>Playoff and championship games in {cityName}</div>
        {[...displayGames].sort((a,b) => archiveSort==='desc' ? (b.game_date||'').localeCompare(a.game_date||'') : (a.game_date||'').localeCompare(b.game_date||'')).map((g, idx) => <Link key={g.id} href={`/game/${g.id}`} onClick={() => {
          const playlist = games.map(gm => ({ href: `/game/${gm.id}`, title: showScore(gm) || gm.title || `${gm.away_team_abbr} @ ${gm.home_team_abbr}` }))
          savePlaylist(playlist, idx)
        }} className="game-row" style={{ padding:'10px 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <SportBadge sport={g.sport}/>
            <span style={{ fontSize:14, color:'var(--ink)' }}>{showScore(g) || g.title || `${g.away_team_abbr} @ ${g.home_team_abbr}`}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
            <span className="sans" style={{ fontSize:10, color:'var(--copper)' }}>{g.series_info}</span>
            <span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{formatDate(g.game_date)}</span>
          </div>
        </Link>)}
        {!showAllGames && games.length > 15 && <div className="box-toggle" onClick={() => setShowAllGames(true)} style={{ textAlign:'center', marginTop:8 }}>Show all {games.length} games &darr;</div>}
        {showAllGames && games.length > 15 && <div className="box-toggle" onClick={() => setShowAllGames(false)} style={{ textAlign:'center', marginTop:8 }}>Show fewer &uarr;</div>}
      </div></>)}

      <div style={{ height:80 }}></div>
    </div>
  )
}
