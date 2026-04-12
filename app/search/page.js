'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, sportLabel, showScore, normalizeCity } from '@/lib/utils'
import Link from 'next/link'
import SportBadge from '@/components/SportBadge'
import TopLogo from '@/components/TopLogo'

export default function SearchPage() {
  const [term, setTerm] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [venues, setVenues] = useState([])
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [notable, setNotable] = useState([])
  const [games, setGames] = useState([])
  const [cities, setCities] = useState([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const timer = useRef(null)
  const sugTimer = useRef(null)
  const wrapRef = useRef(null)

  // Autocomplete suggestions as you type
  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 2) { setSuggestions([]); return }
    const results = []
    // Players first (most common search) - higher limit
    const { data: pl } = await supabase.from('players').select('id,player_name,position,sport').ilike('player_name', `%${q}%`).order('career_points', { ascending: false }).limit(5)
    if (pl) pl.forEach(p => results.push({ type:'player', id:p.id, label:p.player_name, sub:[p.position, sportLabel(p.sport)].filter(Boolean).join(' \u00B7 '), href:`/player/${p.id}` }))
    // Teams
    const { data: tm } = await supabase.from('teams').select('id,full_name,city,sport,primary_color').or(`full_name.ilike.%${q}%,city.ilike.%${q}%,team_abbr.ilike.%${q}%,team_name.ilike.%${q}%`).eq('active', true).limit(3)
    if (tm) tm.forEach(t => { if (!results.find(r => r.label === t.full_name)) results.push({ type:'team', id:t.id, label:t.full_name, sub:sportLabel(t.sport), href:`/team/${t.id}`, color:t.primary_color }) })
    // Notable games (All-Timers) - search titles
    const { data: ng } = await supabase.from('notable_games').select('id,title,sport,game_date').ilike('title', `%${q}%`).order('game_date', { ascending: false }).limit(3)
    if (ng) ng.forEach(n => results.push({ type:'notable', label:n.title, sub:`${sportLabel(n.sport)} \u00B7 ${n.game_date?.split('-')[0]||''}`, href:`/notable/${n.id}` }))
    // Venues
    const { data: vn } = await supabase.from('venues').select('id,venue_name,venue_city,sport').or(`venue_name.ilike.%${q}%,venue_city.ilike.%${q}%`).limit(3)
    if (vn) vn.forEach(v => { if (!results.find(r => r.label === v.venue_name)) results.push({ type:'venue', id:v.id, label:v.venue_name, sub:`${v.venue_city||''} ${v.sport?sportLabel(v.sport):''}`.trim(), href:`/venue/${v.id}` }) })
    // Cities
    const { data: cv } = await supabase.from('venues').select('venue_city').ilike('venue_city', `%${q}%`).limit(5)
    const { data: ct2 } = await supabase.from('teams').select('city').ilike('city', `%${q}%`).eq('active', true).limit(5)
    if (cv || ct2) {
      const citySet = new Set()
      if (cv) cv.forEach(v => { if (v.venue_city) citySet.add(normalizeCity(v.venue_city)) })
      if (ct2) ct2.forEach(t => { if (t.city) citySet.add(t.city) })
      ;[...citySet].slice(0, 2).forEach(c => {
        if (!results.find(r => r.label === c)) results.push({ type:'city', label:c, sub:'City', href:`/city/${encodeURIComponent(c)}` })
      })
    }
    setSuggestions(results)
  }, [])

  // Full search on enter or after delay
  const doSearch = useCallback(async (q) => {
    if (q.length < 2) { setVenues([]); setTeams([]); setPlayers([]); setNotable([]); setGames([]); setCities([]); setSearched(false); return }
    setSearching(true); setShowSuggestions(false)
    const { data: vn } = await supabase.from('venues').select('id,venue_name,venue_city,sport').or(`venue_name.ilike.%${q}%,venue_city.ilike.%${q}%`).limit(5)
    const { data: tm } = await supabase.from('teams').select('id,team_abbr,full_name,city,sport,primary_color').or(`full_name.ilike.%${q}%,team_name.ilike.%${q}%,team_abbr.ilike.%${q}%,city.ilike.%${q}%`).eq('active', true).limit(5)
    const { data: pl } = await supabase.from('players').select('id,player_name,position,ppg,sport').ilike('player_name', `%${q}%`).order('career_points', { ascending: false }).limit(5)
    const { data: nt } = await supabase.from('notable_games').select('id,title,game_date,sport').ilike('title', `%${q}%`).limit(5)
    const { data: gm } = await supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,venue,series_info,sport,title').or(`home_team_abbr.ilike.%${q}%,away_team_abbr.ilike.%${q}%,venue.ilike.%${q}%,title.ilike.%${q}%`).order('game_date', { ascending: false }).limit(15)
    // City search - unique cities from venues and teams
    const { data: cv } = await supabase.from('venues').select('venue_city').ilike('venue_city', `%${q}%`).limit(20)
    const { data: ct } = await supabase.from('teams').select('city').ilike('city', `%${q}%`).eq('active', true).limit(10)
    const citySet = new Set()
    if (cv) cv.forEach(v => { if (v.venue_city) citySet.add(normalizeCity(v.venue_city)) })
    if (ct) ct.forEach(t => { if (t.city) citySet.add(t.city) })
    setCities([...citySet].slice(0, 5))
    setVenues(vn||[]); setTeams(tm||[]); setPlayers(pl||[]); setNotable(nt||[]); setGames(gm||[])
    setSearching(false); setSearched(true)
  }, [])

  function handleInput(val) {
    setTerm(val)
    setShowSuggestions(true)
    setActiveIdx(-1)
    clearTimeout(sugTimer.current)
    sugTimer.current = setTimeout(() => fetchSuggestions(val), 200)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => doSearch(val), 500)
  }

  function handleKeyDown(e) {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
      else if (e.key === 'Enter') {
        e.preventDefault()
        if (activeIdx >= 0 && suggestions[activeIdx]) { handleSuggestionClick(suggestions[activeIdx]) }
        else { setShowSuggestions(false); doSearch(term) }
        return
      } else if (e.key === 'Escape') { setShowSuggestions(false); setActiveIdx(-1); return }
    }
    if (e.key === 'Enter') { setShowSuggestions(false); doSearch(term) }
  }

  // Read ?q= from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) { setTerm(q); doSearch(q) }
  }, [doSearch])

  // Outside click to close suggestions
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSuggestionClick(s) {
    if (s.href) { window.location.href = s.href; return }
    if (s.action) { setTerm(s.action); setShowSuggestions(false); doSearch(s.action) }
  }

  const hasEnt = venues.length+teams.length+players.length+notable.length+cities.length > 0
  const hasAny = hasEnt || games.length > 0

  return (
    <div>
      <TopLogo />
      <div style={{ padding:'16px 20px', borderBottom:'2px solid var(--rule)' }} ref={wrapRef}>
        <div style={{ fontSize:20, color:'var(--ink)', marginBottom:12 }}>Search</div>
        <input className="search-input" type="text" placeholder="Teams, players, venues, cities, games..." value={term}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          autoFocus/>
        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="ac-dropdown">
            {suggestions.map((s,i) => (
              <div key={i} className="ac-item" onClick={() => handleSuggestionClick(s)} onMouseEnter={() => setActiveIdx(i)}
                style={i === activeIdx ? { background:'var(--surface)' } : {}}>
                {s.type === 'team' && <div style={{ width:10, height:10, borderRadius:'50%', background:s.color||'var(--dim)', flexShrink:0 }}></div>}
                {s.type === 'venue' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--copper)" strokeWidth="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>}
                {s.type === 'player' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--copper)" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0112 0v1"/></svg>}
                {s.type === 'notable' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
                {s.type === 'city' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, color:'var(--ink)' }}>{s.label}</div>
                  {s.sub && <div className="ac-sub">{s.sub}</div>}
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            ))}
          </div>
        )}
      </div>
      {searching && <div className="loading">Searching...</div>}
      {hasAny && <div style={{ padding:20 }}>
        {venues.length > 0 && <><div className="sec-head">VENUES</div>{venues.map(v => <Link key={v.id} href={`/venue/${v.id}`} className="game-row" style={{ padding:'10px 0', display:'flex', alignItems:'center', gap:10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--copper)" strokeWidth="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          <div style={{ flex:1 }}><div style={{ fontSize:15, color:'var(--ink)' }}>{v.venue_name}</div><div className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{v.venue_city} {v.sport ? `\u00B7 ${sportLabel(v.sport)}`:''}</div></div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5"><path d="M9 18l6-6-6-6"/></svg>
        </Link>)}</>}
        {teams.length > 0 && <><div className="sec-head" style={{ marginTop:venues.length?16:0 }}>TEAMS</div>{teams.map(t => <Link key={t.id} href={`/team/${t.id}`} className="game-row" style={{ padding:'10px 0', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:t.primary_color||'var(--dim)', flexShrink:0 }}></div>
          <div style={{ flex:1 }}><div style={{ fontSize:15, color:'var(--ink)' }}>{t.full_name}</div><div className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{sportLabel(t.sport)}</div></div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5"><path d="M9 18l6-6-6-6"/></svg>
        </Link>)}</>}
        {players.length > 0 && <><div className="sec-head" style={{ marginTop:(venues.length||teams.length)?16:0 }}>PLAYERS</div>{players.map(p => <Link key={p.id} href={`/player/${p.id}`} className="game-row" style={{ padding:'10px 0', display:'flex', alignItems:'center', gap:10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--copper)" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0112 0v1"/></svg>
          <div style={{ flex:1 }}><div style={{ fontSize:15, color:'var(--ink)' }}>{p.player_name}</div><div className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{p.position}{p.ppg?` \u00B7 ${p.ppg} PPG`:''}</div></div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5"><path d="M9 18l6-6-6-6"/></svg>
        </Link>)}</>}
        {cities.length > 0 && <><div className="sec-head" style={{ marginTop:16 }}>CITIES</div>{cities.map(c => <Link key={c} href={`/city/${encodeURIComponent(c)}`} className="game-row" style={{ padding:'10px 0', display:'flex', alignItems:'center', gap:10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--copper)" strokeWidth="1.5"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>
          <div style={{ flex:1 }}><div style={{ fontSize:15, color:'var(--ink)' }}>{c}</div></div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5"><path d="M9 18l6-6-6-6"/></svg>
        </Link>)}</>}
        {notable.length > 0 && <><div className="sec-head" style={{ marginTop:16 }}>ALL-TIMERS</div>{notable.map(g => <Link key={g.id} href={`/notable/${g.id}`} className="game-row" style={{ padding:'8px 0', display:'flex', alignItems:'center', gap:8 }}><SportBadge sport={g.sport}/><div style={{ flex:1 }}><div style={{ fontSize:14, color:'var(--ink)' }}>{g.title}</div><div className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{formatDate(g.game_date)}</div></div></Link>)}</>}
        {hasEnt && games.length > 0 && <><hr className="sec-rule" style={{ marginTop:16 }}/></>}
        {games.length > 0 && <><div className="sec-head" style={{ marginTop:hasEnt?14:0 }}>GAMES</div>{games.map(g => <Link key={g.id} href={`/game/${g.id}`} className="game-row" style={{ padding:'10px 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}><SportBadge sport={g.sport}/><span style={{ fontSize:14, color:'var(--ink)' }}>{showScore(g) || g.title || `${g.away_team_abbr} @ ${g.home_team_abbr}`}</span></div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}><span className="sans" style={{ fontSize:10, color:'var(--copper)' }}>{g.series_info}</span><span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{formatDate(g.game_date)}</span></div>
        </Link>)}</>}
      </div>}
      {searched && !searching && !hasAny && <div style={{ padding:40, textAlign:'center', color:'var(--dim)', fontSize:13 }}>No results for &ldquo;{term}&rdquo;</div>}
      {!searched && <div style={{ padding:'40px 20px', textAlign:'center' }}><div style={{ fontSize:15, color:'var(--muted)', marginBottom:8 }}>Find anything in the Raftrs database</div><div className="sans" style={{ fontSize:11, color:'var(--dim)', lineHeight:1.6 }}>Try a city like &ldquo;Denver&rdquo;, a player like &ldquo;LeBron&rdquo;, or a venue like &ldquo;Augusta National&rdquo;</div></div>}
    </div>
  )
}
