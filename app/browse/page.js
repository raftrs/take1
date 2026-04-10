'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, sportLabel, showScore, scoreWithWinner, normalizeCity, savePlaylist } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SportBadge from '@/components/SportBadge'
import TopLogo from '@/components/TopLogo'
import GameFinder from '@/components/GameFinder'
import { useAuth } from '@/lib/auth'

const ROUNDS_NBA = ['First Round','Conference Semifinals','Conference Finals','NBA Finals']
const ROUNDS_NFL = ['Wild Card','Divisional','Conference Championship','Super Bowl']
const ROUNDS_GOLF = ['Masters','U.S. Open','The Open','PGA Championship']
const ROUNDS_MLB = ['Wild Card','Division Series','Championship Series','World Series']

function VenueActions({ venueId }) {
  const { user } = useAuth()
  const [visited, setVisited] = useState(false)
  const [listed, setListed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (!user) return
    async function check() {
      const { data: v } = await supabase.from('user_venues').select('id,status').eq('user_id', user.id).eq('venue_id', venueId).limit(1)
      if (v?.[0]) { if (!v[0].status || v[0].status === 'visited') setVisited(true); else setListed(true) }
      setLoaded(true)
    }
    check()
  }, [user, venueId])
  async function toggle(status) {
    if (!user) return
    if (status === 'visited' && visited) { await supabase.from('user_venues').delete().eq('user_id', user.id).eq('venue_id', venueId); setVisited(false); return }
    if (status === 'want' && listed) { await supabase.from('user_venues').delete().eq('user_id', user.id).eq('venue_id', venueId); setListed(false); return }
    await supabase.from('user_venues').upsert({ user_id: user.id, venue_id: venueId, status }, { onConflict: 'user_id,venue_id' })
    if (status === 'visited') { setVisited(true); setListed(false) } else { setListed(true); setVisited(false) }
  }
  if (!loaded) return null
  return (
    <div style={{ display:'flex', gap:8, marginTop:8 }}>
      <button onClick={() => toggle('visited')} style={{ fontFamily:'var(--ui)', fontSize:10, fontWeight:600, padding:'4px 10px', borderRadius:20, border: visited ? '1px solid var(--amber)' : '1px solid var(--faint)', background: visited ? 'var(--amber)' : 'transparent', color: visited ? '#fff' : 'var(--dim)', cursor:'pointer' }}>{visited ? '\u2713 Been here' : "I've been here"}</button>
      <button onClick={() => toggle('want')} style={{ fontFamily:'var(--ui)', fontSize:10, fontWeight:600, padding:'4px 10px', borderRadius:20, border: listed ? '1px solid var(--gold)' : '1px solid var(--faint)', background: listed ? 'var(--gold)' : 'transparent', color: listed ? '#fff' : 'var(--dim)', cursor:'pointer' }}>{listed ? '\u2713 On my list' : 'Want to visit'}</button>
    </div>
  )
}

export default function BrowsePage() {
  const router = useRouter()
  const [sport, setSport] = useState('all')
  const sv = sport === 'all' ? null : sport
  const isGolf = sport === 'golf'

  // Search bar
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const sugRef = useRef(null)

  // Browse data
  const [teams, setTeams] = useState([])
  const [venues, setVenues] = useState([])
  const [ats, setAts] = useState([])
  const [browseCities, setBrowseCities] = useState([])

  // Filters
  const [filters, setFilters] = useState({ team:null, teamSport:null, teamLabel:null, venue:null, year:null, round:null, player:null, city:null })
  const [expanded, setExpanded] = useState(null)
  const [filterSearch, setFilterSearch] = useState('')
  const [filteredGames, setFilteredGames] = useState([])
  const [filtering, setFiltering] = useState(false)
  const [browseSort, setBrowseSort] = useState('desc')
  const [playerOptions, setPlayerOptions] = useState([])
  const [cityOptions, setCityOptions] = useState([])
  const hasFilters = filters.team||filters.venue||filters.year||filters.round||filters.player||filters.city

  // Load browse data
  useEffect(() => {
    async function ld() {
      let tq = supabase.from('teams').select('id,team_abbr,team_name,full_name,sport,primary_color,championships').eq('active',true).order('team_name')
      if (sv) tq = tq.eq('sport', sv)
      const { data: tm } = await tq; setTeams(tm||[])

      let vq = supabase.from('venues').select('id,venue_name,venue_city,sport,description').not('description','is',null).order('venue_name')
      if (sv) vq = vq.eq('sport', sv)
      const { data: vn } = await vq; setVenues(vn||[])

      let aq = supabase.from('notable_games').select('id,title,game_date,sport').eq('tier',1).order('game_date',{ascending:false}).limit(12)
      if (sv) aq = aq.eq('sport', sv)
      const { data: at } = await aq; setAts((at||[]).sort(() => Math.random() - 0.5))

      const { data: ct } = await supabase.from('teams').select('city').eq('active', true).order('city')
      if (ct) {
        const stateNames = new Set(['Arizona','Minnesota','Golden State','Indiana','Carolina','Tennessee','New England','Utah','Oklahoma','Carolina'])
        const citySet = new Set()
        ct.forEach(t => { if (t.city && !stateNames.has(t.city)) citySet.add(normalizeCity(t.city)) })
        setBrowseCities([...citySet].sort())
      }
    }
    ld()
  }, [sport, sv])

  // Autocomplete suggestions
  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 2) { setSuggestions([]); return }
    const results = []
    const { data: pl } = await supabase.from('players').select('id,player_name,position,sport').ilike('player_name', `%${q}%`).order('career_points', { ascending: false }).limit(5)
    if (pl) pl.forEach(p => results.push({ type:'player', label:p.player_name, sub:[p.position, sportLabel(p.sport)].filter(Boolean).join(' \u00B7 '), href:`/player/${p.id}` }))
    const { data: tm } = await supabase.from('teams').select('id,full_name,sport,primary_color').or(`full_name.ilike.%${q}%,city.ilike.%${q}%,team_abbr.ilike.%${q}%,team_name.ilike.%${q}%`).eq('active', true).limit(3)
    if (tm) tm.forEach(t => { if (!results.find(r => r.label === t.full_name)) results.push({ type:'team', label:t.full_name, sub:sportLabel(t.sport), href:`/team/${t.id}`, color:t.primary_color }) })
    const { data: ng } = await supabase.from('notable_games').select('id,title,sport,game_date').ilike('title', `%${q}%`).order('game_date', { ascending: false }).limit(3)
    if (ng) ng.forEach(n => results.push({ type:'notable', label:n.title, sub:`${sportLabel(n.sport)} \u00B7 ${n.game_date?.split('-')[0]||''}`, href:`/notable/${n.id}` }))
    const { data: vn } = await supabase.from('venues').select('id,venue_name,venue_city,sport').or(`venue_name.ilike.%${q}%,venue_city.ilike.%${q}%`).limit(3)
    if (vn) vn.forEach(v => { if (!results.find(r => r.label === v.venue_name)) results.push({ type:'venue', label:v.venue_name, sub:`${v.venue_city||''}`, href:`/venue/${v.id}` }) })
    const { data: cv } = await supabase.from('venues').select('venue_city').ilike('venue_city', `%${q}%`).limit(5)
    if (cv) {
      const s = new Set()
      cv.forEach(v => { if (v.venue_city) s.add(normalizeCity(v.venue_city)) })
      ;[...s].slice(0, 2).forEach(c => {
        if (!results.find(r => r.label === c)) results.push({ type:'city', label:c, sub:'City', href:`/city/${encodeURIComponent(c)}` })
      })
    }
    setSuggestions(results)
    setShowSuggestions(true)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { if (searchTerm.length >= 2) fetchSuggestions(searchTerm) }, 150)
    return () => clearTimeout(t)
  }, [searchTerm, fetchSuggestions])

  // Outside click to close browse suggestions
  useEffect(() => {
    function handleClick(e) {
      if (sugRef.current && !sugRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSearchKeyDown(e) {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
      else if (e.key === 'Enter' && activeIdx >= 0 && suggestions[activeIdx]) { e.preventDefault(); router.push(suggestions[activeIdx].href); setShowSuggestions(false); setSearchTerm(''); return }
      else if (e.key === 'Escape') { setShowSuggestions(false); setActiveIdx(-1); return }
    }
    if (e.key === 'Enter') { router.push(`/search?q=${encodeURIComponent(searchTerm)}`); setShowSuggestions(false) }
  }

  // Apply filters
  const applyFilters = useCallback(async (f) => {
    if (!f.team&&!f.venue&&!f.year&&!f.round&&!f.player&&!f.city) { setFilteredGames([]); return }
    setFiltering(true)
    let q = supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,venue,venue_city,series_info,sport,title').order('game_date',{ascending:browseSort==='asc'}).limit(50)
    if (sv) q = q.eq('sport', sv)
    if (f.team) {
      q = q.or(`home_team_abbr.eq.${f.team},away_team_abbr.eq.${f.team}`)
      if (f.teamSport && !sv) q = q.eq('sport', f.teamSport)
    }
    if (f.venue) q = q.eq('venue', f.venue)
    if (f.year) q = q.gte('game_date',`${f.year}-01-01`).lte('game_date',`${f.year}-12-31`)
    if (f.round) {
      if (f.round === 'Division Series') q = q.or('series_info.ilike.%ALDS%,series_info.ilike.%NLDS%,series_info.ilike.%Division%')
      else if (f.round === 'Championship Series') q = q.or('series_info.ilike.%ALCS%,series_info.ilike.%NLCS%,series_info.ilike.%Championship%')
      else q = q.ilike('series_info', `%${f.round}%`)
    }
    if (f.city) {
      const { data: cv } = await supabase.from('venues').select('venue_name').or(`venue_city.ilike.%${f.city}%`).limit(50)
      if (cv?.length) q = q.in('venue', cv.map(v => v.venue_name))
      else q = q.ilike('venue_city', `%${f.city}%`)
    }
    if (f.player) {
      let allGameResults = []
      // NBA box scores -> nba_game_id -> games.nba_game_id
      const { data: nbaBS } = await supabase.from('box_scores').select('nba_game_id').eq('player_name', f.player).limit(500)
      const espnIds = nbaBS?.length ? [...new Set(nbaBS.map(b => b.nba_game_id))] : []
      // NFL box scores -> espn_game_id -> games.nba_game_id
      const { data: nflBS } = await supabase.from('nfl_box_scores').select('espn_game_id').eq('player_name', f.player).limit(500)
      if (nflBS?.length) espnIds.push(...nflBS.map(b => b.espn_game_id))
      // Fetch NBA/NFL games by nba_game_id
      if (espnIds.length > 0) {
        const { data: espnGames } = await supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,venue,venue_city,series_info,sport,title')
          .in('nba_game_id', [...new Set(espnIds)]).order('game_date',{ascending:browseSort==='asc'})
        if (espnGames?.length) allGameResults.push(...espnGames)
      }
      // MLB box scores -> espn_game_id -> games.nba_game_id
      const { data: mlbBS } = await supabase.from('mlb_box_scores').select('espn_game_id').eq('player_name', f.player).limit(500)
      if (mlbBS?.length) {
        const mlbEspnIds = [...new Set(mlbBS.map(b => b.espn_game_id).filter(Boolean))]
        const { data: mlbGames } = await supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,venue,venue_city,series_info,sport,title')
          .in('nba_game_id', mlbEspnIds).order('game_date',{ascending:browseSort==='asc'})
        if (mlbGames?.length) allGameResults.push(...mlbGames)
      }
      // Golf leaderboard -> game_id -> games.id
      const { data: golfLB } = await supabase.from('golf_leaderboard').select('game_id').eq('player_name', f.player).limit(500)
      if (golfLB?.length) {
        const golfGameIds = [...new Set(golfLB.map(g => g.game_id))]
        const { data: golfGames } = await supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,venue,venue_city,series_info,sport,title')
          .in('id', golfGameIds).order('game_date',{ascending:browseSort==='asc'})
        if (golfGames?.length) allGameResults.push(...golfGames)
      }
      // Dedupe and sort
      const seen = new Set()
      allGameResults = allGameResults.filter(g => { if (seen.has(g.id)) return false; seen.add(g.id); return true })
      // Apply other active filters to player results
      if (sv) allGameResults = allGameResults.filter(g => g.sport === sv)
      if (f.venue) allGameResults = allGameResults.filter(g => g.venue === f.venue)
      if (f.team) allGameResults = allGameResults.filter(g => g.home_team_abbr === f.team || g.away_team_abbr === f.team)
      if (f.year) allGameResults = allGameResults.filter(g => g.game_date?.startsWith(f.year))
      if (f.round) allGameResults = allGameResults.filter(g => {
        const si = (g.series_info || '').toLowerCase()
        if (f.round === 'Division Series') return si.includes('alds') || si.includes('nlds') || si.includes('division')
        if (f.round === 'Championship Series') return si.includes('alcs') || si.includes('nlcs') || si.includes('championship')
        return si.includes(f.round.toLowerCase())
      })
      if (f.city) allGameResults = allGameResults.filter(g => g.venue_city?.toLowerCase().includes(f.city.toLowerCase()))
      allGameResults.sort((a,b) => browseSort==='asc' ? (a.game_date||'').localeCompare(b.game_date||'') : (b.game_date||'').localeCompare(a.game_date||''))
      setFilteredGames(allGameResults); setFiltering(false); return
    }
    const { data } = await q; setFilteredGames(data||[]); setFiltering(false)
  }, [sv, browseSort])

  function setF(k,v) { const n={...filters,[k]:v}; setFilters(n); setExpanded(null); setFilterSearch(''); applyFilters(n) }
  function clearF(k) { const n={...filters,[k]:null}; if(k==='team'){n.teamSport=null;n.teamLabel=null} setFilters(n); applyFilters(n) }
  function clearAll() { setFilters({team:null,teamSport:null,teamLabel:null,venue:null,year:null,round:null,player:null,city:null}); setFilteredGames([]) }

  const roundOpts = sport==='football'?ROUNDS_NFL:sport==='golf'?ROUNDS_GOLF:sport==='basketball'?ROUNDS_NBA:sport==='baseball'?ROUNDS_MLB:[...ROUNDS_NBA,...ROUNDS_NFL,...ROUNDS_GOLF,...ROUNDS_MLB]

  async function searchPlayers(q) {
    if (q.length < 2) { setPlayerOptions([]); return }
    let pq = supabase.from('players').select('id,player_name,position,sport').ilike('player_name', `%${q}%`).order('career_points',{ascending:false}).limit(10)
    if (sv) pq = pq.eq('sport', sv)
    const { data } = await pq; setPlayerOptions(data||[])
  }
  async function searchCities(q) {
    if (q.length < 2) { setCityOptions([]); return }
    const { data: cv } = await supabase.from('venues').select('venue_city').ilike('venue_city', `%${q}%`).limit(20)
    const { data: ct } = await supabase.from('teams').select('city').ilike('city', `%${q}%`).eq('active', true).limit(10)
    const s = new Set()
    if (cv) cv.forEach(v => { if (v.venue_city) s.add(normalizeCity(v.venue_city)) })
    if (ct) ct.forEach(t => { if (t.city) s.add(normalizeCity(t.city)) })
    setCityOptions([...s].slice(0, 10))
  }

  function switchSport(s) {
    setSport(s)
    const n = { ...filters, team: null, teamSport: null, teamLabel: null, round: null, player: null }
    setFilters(n)
    if (n.venue || n.year || n.city) applyFilters(n)
    else setFilteredGames([])
  }

  const filterDefs = [
    ...(!isGolf ? [{ k:'team', l:'Team' }] : []),
    { k:'city', l:'City' },
    { k:'venue', l:isGolf?'Course':'Venue' },
    { k:'player', l:'Player' },
    { k:'year', l:'Year' },
    { k:'round', l:isGolf?'Major':'Round' },
  ]

  return (
    <div>
      <TopLogo />

      {/* SEARCH BAR */}
      <div style={{ padding:'16px 20px 0', position:'relative' }} ref={sugRef}>
        <input
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setActiveIdx(-1); if (e.target.value.length < 2) { setSuggestions([]); setShowSuggestions(false); } }}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search players, teams, games, venues..."
          className="search-input"
          style={{ width:'100%', fontSize:16, fontFamily:'var(--body)', color:'var(--ink)', backgroundColor:'var(--card)', border:'2px solid var(--faint)', borderRadius:4, outline:'none', boxSizing:'border-box' }}
        />
        {/* Autocomplete dropdown - stays on top */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{ position:'absolute', left:20, right:20, top:'100%', backgroundColor:'var(--card)', border:'1px solid var(--faint)', borderRadius:4, zIndex:100, maxHeight:320, overflowY:'auto', boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}>
            {suggestions.map((s, i) => (
              <Link key={i} href={s.href} onClick={() => { setShowSuggestions(false); setSearchTerm(''); }} onMouseEnter={() => setActiveIdx(i)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderBottom:'1px solid var(--faint)', textDecoration:'none', color:'var(--ink)', background: i === activeIdx ? 'var(--surface)' : 'transparent' }}>
                {s.color && <div style={{ width:8, height:8, borderRadius:'50%', backgroundColor:s.color, flexShrink:0 }} />}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14 }}>{s.label}</div>
                  <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:1 }}>{s.sub}</div>
                </div>
                <span className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:1, textTransform:'uppercase' }}>{s.type}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* OR BROWSE BY divider */}
      <div style={{ padding:'10px 20px 0', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ flex:1, height:1, background:'var(--faint)' }} />
        <span className="sans" style={{ fontSize:10, color:'var(--dim)', letterSpacing:1 }}>OR BROWSE BY</span>
        <div style={{ flex:1, height:1, background:'var(--faint)' }} />
      </div>

      {/* SPORT TABS */}
      <div style={{ padding:'10px 20px 0', borderBottom:'2px solid var(--rule)' }}>
        <div style={{ display:'flex' }}>
          {['all','basketball','football','golf','baseball'].map(s => {
            const active = sport===s
            return <button key={s} onClick={() => switchSport(s)} style={{ flex:1, padding:'10px 0', fontSize:12, fontFamily:'var(--ui)', fontWeight:600, background:'none', border:'none', cursor:'pointer', color:active?'var(--copper)':'var(--dim)', borderBottom:active?'2px solid var(--copper)':'2px solid var(--faint)' }}>{s==='all'?'All':sportLabel(s)}</button>
          })}
        </div>
      </div>

      {/* FILTER CHIPS */}
      <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--faint)', display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
        {filterDefs.map(f => {
          const v = filters[f.k]
          const isOpen = expanded === f.k
          const display = f.k === 'team' && filters.teamLabel ? filters.teamLabel : v
          return <button key={f.k} onClick={() => setExpanded(isOpen ? null : f.k)} style={{
            padding:'6px 12px', fontSize:11, fontFamily:'var(--ui)', fontWeight:600,
            background: v ? 'var(--copper)' : 'var(--card)',
            color: v ? '#fff' : 'var(--dim)',
            border: `1px solid ${v ? 'var(--copper)' : 'var(--faint)'}`,
            borderRadius: 20, cursor:'pointer',
          }}>
            {display || f.l} {v ? <span onClick={e => { e.stopPropagation(); clearF(f.k) }} style={{ marginLeft:4, cursor:'pointer' }}>&times;</span> : '\u25BE'}
          </button>
        })}
        {hasFilters && <button onClick={clearAll} className="sans" style={{ padding:'6px 10px', fontSize:10, background:'none', border:'none', color:'var(--copper)', cursor:'pointer' }}>Clear all</button>}
      </div>

      {/* FILTER DROPDOWNS */}
      {expanded==='team' && <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--faint)', background:'var(--surface)', maxHeight:250, overflowY:'auto' }}>
        <input className="search-input" placeholder="Search teams..." value={filterSearch} onChange={e=>setFilterSearch(e.target.value)} style={{ marginBottom:8, fontSize:12, padding:'8px 12px' }}/>
        {teams.filter(t=>!filterSearch||t.full_name?.toLowerCase().includes(filterSearch.toLowerCase())).map(t =>
          <div key={t.id} onClick={()=>{const n={...filters,team:t.team_abbr,teamSport:t.sport,teamLabel:t.full_name};setFilters(n);setExpanded(null);setFilterSearch('');applyFilters(n)}} style={{ padding:'8px 0', cursor:'pointer', fontSize:13, color:'var(--ink)', borderBottom:'1px solid var(--faint)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:t.primary_color||'var(--dim)', display:'inline-block' }}></span>{t.full_name}
          </div>)}
      </div>}

      {expanded==='city' && <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--faint)', background:'var(--surface)', maxHeight:250, overflowY:'auto' }}>
        <input className="search-input" placeholder="Search cities..." value={filterSearch} onChange={e=>{setFilterSearch(e.target.value);searchCities(e.target.value)}} style={{ marginBottom:8, fontSize:12, padding:'8px 12px' }}/>
        {cityOptions.map(c =>
          <div key={c} onClick={()=>setF('city',c)} style={{ padding:'8px 0', cursor:'pointer', fontSize:13, color:'var(--ink)', borderBottom:'1px solid var(--faint)' }}>{c}</div>)}
        {filterSearch.length >= 2 && cityOptions.length === 0 && <div className="sans" style={{ fontSize:11, color:'var(--dim)', padding:8 }}>No cities found</div>}
      </div>}

      {expanded==='venue' && <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--faint)', background:'var(--surface)', maxHeight:250, overflowY:'auto' }}>
        <input className="search-input" placeholder="Search venues..." value={filterSearch} onChange={e=>setFilterSearch(e.target.value)} style={{ marginBottom:8, fontSize:12, padding:'8px 12px' }}/>
        {venues.filter(v=>!filterSearch||v.venue_name?.toLowerCase().includes(filterSearch.toLowerCase())||v.venue_city?.toLowerCase().includes(filterSearch.toLowerCase())).slice(0,30).map(v =>
          <div key={v.id} onClick={()=>setF('venue',v.venue_name)} style={{ padding:'8px 0', cursor:'pointer', fontSize:13, color:'var(--ink)', borderBottom:'1px solid var(--faint)' }}>{v.venue_name} <span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{v.venue_city}</span></div>)}
      </div>}

      {expanded==='player' && <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--faint)', background:'var(--surface)', maxHeight:250, overflowY:'auto' }}>
        <input className="search-input" placeholder="Search players..." value={filterSearch} onChange={e=>{setFilterSearch(e.target.value);searchPlayers(e.target.value)}} style={{ marginBottom:8, fontSize:12, padding:'8px 12px' }}/>
        {playerOptions.map(p =>
          <div key={p.id} onClick={()=>setF('player',p.player_name)} style={{ padding:'8px 0', cursor:'pointer', fontSize:13, color:'var(--ink)', borderBottom:'1px solid var(--faint)', display:'flex', alignItems:'center', gap:8 }}>
            <span>{p.player_name}</span><span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{p.position}</span>
          </div>)}
        {filterSearch.length >= 2 && playerOptions.length === 0 && <div className="sans" style={{ fontSize:11, color:'var(--dim)', padding:8 }}>No players found</div>}
      </div>}

      {expanded==='year' && <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--faint)', background:'var(--surface)' }}>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {(() => { const yrs = []; for (let y = new Date().getFullYear(); y >= 1967; y--) yrs.push(y); return yrs.map(y => (
            <button key={y} onClick={() => setF('year', String(y))} className="sans" style={{
              padding:'6px 12px', fontSize:11, fontWeight: filters.year === String(y) ? 700 : 500,
              background: filters.year === String(y) ? 'var(--copper)' : 'var(--card)',
              color: filters.year === String(y) ? '#fff' : 'var(--ink)',
              border:'1px solid var(--faint)', borderRadius:20, cursor:'pointer',
            }}>{y}</button>
          )) })()}
        </div>
      </div>}

      {expanded==='round' && <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--faint)', background:'var(--surface)' }}>
        {roundOpts.map(r => <div key={r} onClick={()=>setF('round',r)} style={{ padding:'8px 0', cursor:'pointer', fontSize:13, color:'var(--ink)', borderBottom:'1px solid var(--faint)' }}>{r}</div>)}
      </div>}

      {/* FILTERED RESULTS */}
      {hasFilters && <div style={{ padding:20 }}>
        {filtering ? <div className="loading">Loading...</div> : <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div className="sec-head" style={{ marginBottom:0 }}>{filteredGames.length} GAME{filteredGames.length!==1?'S':''}</div>
            <div style={{ display:'flex' }}>
              {['Recent','Oldest'].map(s => <button key={s} onClick={() => { setBrowseSort(s==='Recent'?'desc':'asc'); setTimeout(() => applyFilters(filters), 0) }} className="sans" style={{ padding:'3px 10px', fontSize:10, fontWeight:600, background:'none', border:'none', cursor:'pointer', color:(s==='Recent'?'desc':'asc')===browseSort?'var(--copper)':'var(--dim)', borderBottom:(s==='Recent'?'desc':'asc')===browseSort?'2px solid var(--copper)':'2px solid transparent' }}>{s}</button>)}
            </div>
          </div>
          {filteredGames.map((g, idx) => { const sw = scoreWithWinner(g); return <Link key={g.id} href={`/game/${g.id}`} onClick={() => {
            savePlaylist(filteredGames.map(fg => ({ href: `/game/${fg.id}`, title: showScore(fg) || fg.title || `${fg.away_team_abbr} @ ${fg.home_team_abbr}` })), idx)
          }} className="game-row" style={{ padding:'10px 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}><SportBadge sport={g.sport}/>
              {sw ? <span style={{ fontSize:14 }}><span style={{ color: sw.away.won ? 'var(--ink)' : 'var(--dim)', fontWeight: sw.away.won ? 700 : 400 }}>{sw.away.abbr} {sw.away.score}</span><span style={{ color:'var(--dim)' }}> / </span><span style={{ color: sw.home.won ? 'var(--ink)' : 'var(--dim)', fontWeight: sw.home.won ? 700 : 400 }}>{sw.home.score} {sw.home.abbr}</span></span>
                : <span style={{ fontSize:14, color:'var(--ink)' }}>{g.title || `${g.away_team_abbr} @ ${g.home_team_abbr}`}</span>}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}><span className="sans" style={{ fontSize:10, color:'var(--copper)' }}>{g.series_info}</span><span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{formatDate(g.game_date)}</span></div>
          </Link>})}
          {filteredGames.length===0 && <div style={{ fontSize:13, color:'var(--dim)', padding:'20px 0' }}>No games match these filters</div>}
        </>}
      </div>}

      {/* DEFAULT BROWSE CONTENT */}
      {!hasFilters && <div style={{ padding:20 }}>
        {teams.length > 0 && !isGolf && (() => {
          const nbaTeams = teams.filter(t => t.sport === 'basketball').sort((a,b) => (a.team_abbr||'').localeCompare(b.team_abbr||''))
          const nflTeams = teams.filter(t => t.sport === 'football').sort((a,b) => (a.team_abbr||'').localeCompare(b.team_abbr||''))
          const mlbTeams = teams.filter(t => t.sport === 'baseball').sort((a,b) => (a.team_abbr||'').localeCompare(b.team_abbr||''))
          return <>
            {(sport === 'all' || sport === 'basketball') && nbaTeams.length > 0 && <><div className="sec-head">NBA</div><div className="team-grid">{nbaTeams.map(t => <Link key={t.id} href={`/team/${t.id}`} className="team-chip" style={{ borderLeftColor:t.primary_color||'var(--faint)' }}>{t.team_abbr}</Link>)}</div></>}
            {(sport === 'all' || sport === 'football') && nflTeams.length > 0 && <><div className="sec-head" style={{ marginTop:nbaTeams.length > 0 ? 20 : 0 }}>NFL</div><div className="team-grid">{nflTeams.map(t => <Link key={t.id} href={`/team/${t.id}`} className="team-chip" style={{ borderLeftColor:t.primary_color||'var(--faint)' }}>{t.team_abbr}</Link>)}</div></>}
            {(sport === 'all' || sport === 'baseball') && mlbTeams.length > 0 && <><div className="sec-head" style={{ marginTop:(nbaTeams.length||nflTeams.length) > 0 ? 20 : 0 }}>MLB</div><div className="team-grid">{mlbTeams.map(t => <Link key={t.id} href={`/team/${t.id}`} className="team-chip" style={{ borderLeftColor:t.primary_color||'var(--faint)' }}>{t.team_abbr}</Link>)}</div></>}
          </>
        })()}
        {ats.length > 0 && <><div className="sec-head" style={{ marginTop:24 }}>ALL-TIMERS</div>{ats.map(g => <Link key={g.id} href={`/notable/${g.id}`} className="game-row" style={{ padding:'8px 0' }}><div style={{ display:'flex', alignItems:'center', gap:8 }}><SportBadge sport={g.sport}/><span style={{ fontSize:13, color:'var(--ink)' }}>{g.title}</span></div><div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2, marginLeft:44 }}>{formatDate(g.game_date)}</div></Link>)}</>}
        <div style={{ marginTop:24 }}>
          <div className="sec-head">FIND A MATCHUP</div>
          <GameFinder />
        </div>
        {browseCities.length > 0 && <><div className="sec-head" style={{ marginTop:24 }}>CITIES</div><div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{browseCities.map(c => <Link key={c} href={`/city/${encodeURIComponent(c)}`} style={{ padding:'6px 12px', fontSize:11, fontFamily:'var(--ui)', background:'var(--card)', border:'1px solid var(--faint)', color:'var(--ink)', textDecoration:'none', borderRadius:4 }}>{c}</Link>)}</div></>}
        {venues.length > 0 && <><div className="sec-head" style={{ marginTop:24 }}>{isGolf?'COURSES':'VENUES'} <Link href="/venues" className="sec-link">See all</Link></div><div style={{ maxHeight:420, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>{venues.slice(0,7).map(v => <div key={v.id} style={{ padding:'12px 14px', background:'var(--surface)', border:'1px solid var(--faint)', borderRadius:4 }}>
          <Link href={`/venue/${v.id}`} style={{ textDecoration:'none', display:'block' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontSize:14, color:'var(--ink)', fontWeight:600 }}>{v.venue_name}</span>
              <span style={{ fontFamily:'var(--ui)', fontSize:10, color:'var(--dim)' }}>{v.venue_city}</span>
            </div>
            {v.description && <div style={{ fontFamily:'var(--ui)', fontSize:11, color:'var(--muted)', marginTop:4, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{v.description}</div>}
          </Link>
          <VenueActions venueId={v.id} />
        </div>)}</div></>}
      </div>}

      {/* THE VAULT - hidden entrance */}
      <div onClick={() => router.push('/vault')} style={{
        margin:'20px 20px 0', padding:'24px 20px', cursor:'pointer',
        background:'linear-gradient(180deg, #3d1f0e 0%, #2a1508 100%)',
        borderRadius:6, textAlign:'center', position:'relative',
        border:'1px solid #5a4a3a',
      }}>
        <div style={{ fontSize:9, letterSpacing:4, color:'#a08b70', fontWeight:700, fontFamily:'var(--ui)', marginBottom:8 }}>ENTER</div>
        <div style={{ fontSize:18, color:'var(--gold)', letterSpacing:2 }}>The Vault</div>
        <div style={{ fontSize:11, color:'#8a7d70', marginTop:8, fontStyle:'italic' }}>All-Timers. Collections. The ones that matter.</div>
        <div style={{ width:40, height:1, background:'var(--gold)', margin:'14px auto 0', opacity:0.4 }}/>
      </div>
    </div>
  )
}
