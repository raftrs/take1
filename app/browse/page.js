'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, sportLabel, showScore, savePlaylist } from '@/lib/utils'
import Link from 'next/link'
import SportBadge from '@/components/SportBadge'
import TopLogo from '@/components/TopLogo'

const DECADES = ['1960s','1970s','1980s','1990s','2000s','2010s','2020s']
const ROUNDS_NBA = ['First Round','Conference Semifinals','Conference Finals','NBA Finals']
const ROUNDS_NFL = ['Wild Card','Divisional','Conference Championship','Super Bowl']
const ROUNDS_GOLF = ['Masters','U.S. Open','The Open','PGA Championship']

export default function BrowsePage() {
  const [sport, setSport] = useState('all')
  const [teams, setTeams] = useState([])
  const [venues, setVenues] = useState([])
  const [ats, setAts] = useState([])
  const [players, setPlayers] = useState([])
  const [browseCities, setBrowseCities] = useState([])
  const [filters, setFilters] = useState({ team:null, teamSport:null, teamLabel:null, venue:null, decade:null, round:null, player:null, city:null })
  const [expanded, setExpanded] = useState(null)
  const [filterSearch, setFilterSearch] = useState('')
  const [filteredGames, setFilteredGames] = useState([])
  const [filtering, setFiltering] = useState(false)
  const [playerOptions, setPlayerOptions] = useState([])
  const [cityOptions, setCityOptions] = useState([])
  const hasFilters = filters.team||filters.venue||filters.decade||filters.round||filters.player||filters.city
  const sv = sport==='all'?null:sport
  const isGolf = sport === 'golf'

  useEffect(() => {
    async function ld() {
      let tq = supabase.from('teams').select('id,team_abbr,team_name,full_name,sport,primary_color,championships').eq('active',true).order('team_name')
      if (sv) tq = tq.eq('sport', sv)
      const { data: tm } = await tq; setTeams(tm||[])

      let vq = supabase.from('venues').select('id,venue_name,venue_city,sport').not('description','is',null).order('venue_name')
      if (sv) vq = vq.eq('sport', sv)
      const { data: vn } = await vq; setVenues(vn||[])

      let aq = supabase.from('notable_games').select('id,title,game_date,sport').eq('tier',1).order('game_date',{ascending:false}).limit(12)
      if (sv) aq = aq.eq('sport', sv)
      const { data: at } = await aq; setAts(at||[])

      let pq = supabase.from('players').select('id,player_name,position,ppg,sport').not('ppg','is',null).order('career_points',{ascending:false}).limit(20)
      if (sv) pq = pq.eq('sport', sv)
      const { data: pl } = await pq; setPlayers(pl||[])

      // Load unique cities from teams
      const { data: ct } = await supabase.from('teams').select('city').eq('active', true).order('city')
      if (ct) {
        const citySet = new Set()
        ct.forEach(t => { if (t.city) citySet.add(t.city) })
        setBrowseCities([...citySet])
      }
    }
    ld()
    // FIX #50: Don't reset filters when switching sport
  }, [sport, sv])

  const applyFilters = useCallback(async (f) => {
    if (!f.team&&!f.venue&&!f.decade&&!f.round&&!f.player&&!f.city) { setFilteredGames([]); return }
    setFiltering(true)
    let q = supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,venue,series_info,sport,title').order('game_date',{ascending:false}).limit(50)
    if (sv) q = q.eq('sport', sv)
    if (f.team) {
      q = q.or(`home_team_abbr.eq.${f.team},away_team_abbr.eq.${f.team}`)
      // Fix: also filter by team's sport to disambiguate CHI (Bulls vs Bears)
      if (f.teamSport && !sv) q = q.eq('sport', f.teamSport)
    }
    if (f.venue) q = q.eq('venue', f.venue)
    if (f.decade) { const y=parseInt(f.decade); q=q.gte('game_date',`${y}-01-01`).lt('game_date',`${y+10}-01-01`) }
    if (f.round) q = q.ilike('series_info', `%${f.round}%`)

    // City filter - find venues in this city, filter games by those venues
    if (f.city) {
      const { data: cv } = await supabase.from('venues').select('venue_name').or(`venue_city.ilike.%${f.city}%`).limit(50)
      if (cv?.length) {
        const venueNames = cv.map(v => v.venue_name)
        q = q.in('venue', venueNames)
      } else {
        q = q.ilike('venue_city', `%${f.city}%`)
      }
    }

    // Player filter: search all box score tables
    if (f.player) {
      let espnIds = []
      // NBA
      const { data: nbaBS } = await supabase.from('box_scores').select('nba_game_id').eq('player_name', f.player).limit(500)
      if (nbaBS?.length) espnIds.push(...nbaBS.map(b => b.nba_game_id))
      // NFL
      const { data: nflBS } = await supabase.from('nfl_box_scores').select('espn_game_id').eq('player_name', f.player).limit(500)
      if (nflBS?.length) espnIds.push(...nflBS.map(b => b.espn_game_id))
      // Golf - uses game_id directly
      const { data: golfLB } = await supabase.from('golf_leaderboard').select('game_id').eq('player_name', f.player).limit(500)

      if (espnIds.length > 0) {
        const uniqueIds = [...new Set(espnIds)]
        q = q.in('nba_game_id', uniqueIds)
      }
      // For golf, we need to also get games by id
      if (golfLB?.length) {
        const golfGameIds = [...new Set(golfLB.map(g => g.game_id))]
        const { data: golfGames } = await supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,venue,series_info,sport,title')
          .in('id', golfGameIds).order('game_date',{ascending:false})
        if (espnIds.length === 0) {
          setFilteredGames(golfGames||[]); setFiltering(false); return
        }
        // Merge NFL/NBA results with golf
        const { data: otherGames } = await q
        const merged = [...(otherGames||[]), ...(golfGames||[])].sort((a,b) => b.game_date?.localeCompare(a.game_date))
        setFilteredGames(merged); setFiltering(false); return
      }
      if (espnIds.length === 0) {
        setFilteredGames([]); setFiltering(false); return
      }
    }
    const { data } = await q; setFilteredGames(data||[]); setFiltering(false)
  }, [sv])

  function setF(k,v) { const n={...filters,[k]:v}; setFilters(n); setExpanded(null); setFilterSearch(''); applyFilters(n) }
  function clearF(k) { const n={...filters,[k]:null}; if(k==='team'){n.teamSport=null;n.teamLabel=null} setFilters(n); applyFilters(n) }
  function clearAll() { const n={team:null,teamSport:null,teamLabel:null,venue:null,decade:null,round:null,player:null,city:null}; setFilters(n); setFilteredGames([]) }
  const roundOpts = sport==='football'?ROUNDS_NFL:sport==='golf'?ROUNDS_GOLF:sport==='basketball'?ROUNDS_NBA:[...ROUNDS_NBA,...ROUNDS_NFL,...ROUNDS_GOLF]

  // Player search for filter dropdown
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
    if (cv) cv.forEach(v => { if (v.venue_city) s.add(v.venue_city) })
    if (ct) ct.forEach(t => { if (t.city) s.add(t.city) })
    setCityOptions([...s].slice(0, 10))
  }

  const filterDefs = [
    ...(!isGolf ? [{ k:'team', l:'Team' }] : []),
    { k:'city', l:'City' },
    { k:'venue', l:isGolf?'Course':'Venue' },
    { k:'player', l:'Player' },
    { k:'decade', l:'Decade' },
    { k:'round', l:isGolf?'Major':'Round' },
  ]

  function switchSport(s) {
    setSport(s)
    const n = { ...filters, team: null, teamSport: null, round: null, player: null }
    setFilters(n)
    if (n.venue || n.decade || n.city) applyFilters(n)
    else setFilteredGames([])
  }
  return (
    <div>
      <TopLogo />
      <div style={{ padding:'16px 20px 0', borderBottom:'2px solid var(--rule)' }}>
        <div style={{ fontSize:20, color:'var(--ink)', marginBottom:12 }}>Browse</div>
        <div style={{ display:'flex' }}>
          {['all','basketball','football','golf'].map(s => {
            const active = sport===s
            return <button key={s} onClick={() => switchSport(s)} style={{ flex:1, padding:'10px 0', fontSize:12, fontFamily:'Arial,sans-serif', fontWeight:600, background:'none', border:'none', cursor:'pointer', color:active?'var(--copper)':'var(--dim)', borderBottom:active?'2px solid var(--copper)':'2px solid var(--faint)' }}>{s==='all'?'All':sportLabel(s)}</button>
          })}
        </div>
      </div>

      <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--faint)', display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
        {filterDefs.map(f => {
          const v=filters[f.k], isO=expanded===f.k
          const display = f.k === 'team' && filters.teamLabel ? filters.teamLabel : v
          return <button key={f.k} onClick={() => setExpanded(isO?null:f.k)} style={{ padding:'6px 12px', fontSize:11, fontFamily:'Arial,sans-serif', fontWeight:600, background:v?'var(--copper)':'var(--card)', color:v?'#fff':'var(--dim)', border:`1px solid ${v?'var(--copper)':'var(--faint)'}`, cursor:'pointer' }}>
            {display||f.l} {v ? <span onClick={e=>{e.stopPropagation();clearF(f.k)}} style={{marginLeft:4,cursor:'pointer'}}>&times;</span> : '\u25BE'}
          </button>
        })}
        {hasFilters && <button onClick={clearAll} style={{ padding:'6px 10px', fontSize:10, fontFamily:'Arial,sans-serif', background:'none', border:'none', color:'var(--copper)', cursor:'pointer' }}>Clear all</button>}
      </div>

      {expanded==='team' && <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--faint)', background:'var(--surface)', maxHeight:250, overflowY:'auto' }}>
        <input className="search-input" placeholder="Search teams..." value={filterSearch} onChange={e=>setFilterSearch(e.target.value)} style={{ marginBottom:8, fontSize:12, padding:'8px 12px' }}/>
        {teams.filter(t=>!filterSearch||t.full_name?.toLowerCase().includes(filterSearch.toLowerCase())).map(t =>
          <div key={t.id} onClick={()=>{const n={...filters,team:t.team_abbr,teamSport:t.sport,teamLabel:t.full_name||t.team_abbr};setFilters(n);setExpanded(null);setFilterSearch('');applyFilters(n)}} style={{ padding:'8px 0', cursor:'pointer', fontSize:13, color:'var(--ink)', borderBottom:'1px solid var(--faint)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:t.primary_color||'var(--dim)', display:'inline-block' }}></span>{t.full_name}
          </div>)}
      </div>}
      {expanded==='city' && <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--faint)', background:'var(--surface)', maxHeight:250, overflowY:'auto' }}>
        <input className="search-input" placeholder="Search cities..." value={filterSearch} onChange={e=>{setFilterSearch(e.target.value);searchCities(e.target.value)}} style={{ marginBottom:8, fontSize:12, padding:'8px 12px' }}/>
        {cityOptions.map(c =>
          <div key={c} onClick={()=>setF('city',c)} style={{ padding:'8px 0', cursor:'pointer', fontSize:13, color:'var(--ink)', borderBottom:'1px solid var(--faint)', display:'flex', alignItems:'center', gap:8 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--copper)" strokeWidth="1.5"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>
            <span>{c}</span>
          </div>)}
        {filterSearch.length >= 2 && cityOptions.length === 0 && <div className="sans" style={{ fontSize:11, color:'var(--dim)', padding:8 }}>No cities found</div>}
      </div>}
      {expanded==='venue' && <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--faint)', background:'var(--surface)', maxHeight:250, overflowY:'auto' }}>
        <input className="search-input" placeholder="Search..." value={filterSearch} onChange={e=>setFilterSearch(e.target.value)} style={{ marginBottom:8, fontSize:12, padding:'8px 12px' }}/>
        {venues.filter(v=>!filterSearch||v.venue_name?.toLowerCase().includes(filterSearch.toLowerCase())||v.venue_city?.toLowerCase().includes(filterSearch.toLowerCase())).slice(0,30).map(v =>
          <div key={v.id} onClick={()=>setF('venue',v.venue_name)} style={{ padding:'8px 0', cursor:'pointer', fontSize:13, color:'var(--ink)', borderBottom:'1px solid var(--faint)' }}>{v.venue_name} <span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{v.venue_city}</span></div>)}
      </div>}
      {/* FIX #45: Player filter */}
      {expanded==='player' && <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--faint)', background:'var(--surface)', maxHeight:250, overflowY:'auto' }}>
        <input className="search-input" placeholder="Search players..." value={filterSearch} onChange={e=>{setFilterSearch(e.target.value);searchPlayers(e.target.value)}} style={{ marginBottom:8, fontSize:12, padding:'8px 12px' }}/>
        {playerOptions.map(p =>
          <div key={p.id} onClick={()=>setF('player',p.player_name)} style={{ padding:'8px 0', cursor:'pointer', fontSize:13, color:'var(--ink)', borderBottom:'1px solid var(--faint)', display:'flex', alignItems:'center', gap:8 }}>
            <span>{p.player_name}</span>
            <span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{p.position}</span>
          </div>)}
        {filterSearch.length >= 2 && playerOptions.length === 0 && <div className="sans" style={{ fontSize:11, color:'var(--dim)', padding:8 }}>No players found</div>}
      </div>}
      {expanded==='decade' && <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--faint)', background:'var(--surface)', display:'flex', flexWrap:'wrap', gap:6 }}>
        {DECADES.map(d => <div key={d} onClick={()=>setF('decade',d)} style={{ padding:'8px 16px', cursor:'pointer', fontSize:13, background:filters.decade===d?'var(--copper)':'var(--card)', color:filters.decade===d?'#fff':'var(--ink)', border:'1px solid var(--faint)' }}>{d}</div>)}
      </div>}
      {expanded==='round' && <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--faint)', background:'var(--surface)' }}>
        {roundOpts.map(r => <div key={r} onClick={()=>setF('round',r)} style={{ padding:'8px 0', cursor:'pointer', fontSize:13, color:'var(--ink)', borderBottom:'1px solid var(--faint)' }}>{r}</div>)}
      </div>}

      {hasFilters && <div style={{ padding:20 }}>
        {filtering ? <div className="loading">Loading...</div> : <>
          <div className="sec-head">{filteredGames.length} GAME{filteredGames.length!==1?'S':''}</div>
          {filteredGames.map((g, idx) => <Link key={g.id} href={`/game/${g.id}`} onClick={() => {
            const playlist = filteredGames.map(fg => ({ href: `/game/${fg.id}`, title: showScore(fg) || fg.title || `${fg.away_team_abbr} @ ${fg.home_team_abbr}` }))
            savePlaylist(playlist, idx)
          }} className="game-row" style={{ padding:'10px 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}><SportBadge sport={g.sport}/><span style={{ fontSize:14, color:'var(--ink)' }}>{showScore(g) || g.title || `${g.away_team_abbr} @ ${g.home_team_abbr}`}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}><span className="sans" style={{ fontSize:10, color:'var(--copper)' }}>{g.series_info}</span><span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{formatDate(g.game_date)}</span></div>
          </Link>)}
          {filteredGames.length===0 && <div style={{ fontSize:13, color:'var(--dim)', padding:'20px 0' }}>No games match these filters</div>}
        </>}
      </div>}

      {!hasFilters && <div style={{ padding:20 }}>
        {teams.length > 0 && !isGolf && (() => {
          const nbaTeams = teams.filter(t => t.sport === 'basketball').sort((a,b) => (a.team_abbr||'').localeCompare(b.team_abbr||''))
          const nflTeams = teams.filter(t => t.sport === 'football').sort((a,b) => (a.team_abbr||'').localeCompare(b.team_abbr||''))
          return <>
            {(sport === 'all' || sport === 'basketball') && nbaTeams.length > 0 && <><div className="sec-head">NBA</div><div className="team-grid">{nbaTeams.map(t => <Link key={t.id} href={`/team/${t.id}`} className="team-chip" style={{ borderLeftColor:t.primary_color||'var(--faint)' }}>{t.team_abbr}</Link>)}</div></>}
            {(sport === 'all' || sport === 'football') && nflTeams.length > 0 && <><div className="sec-head" style={{ marginTop:nbaTeams.length > 0 ? 20 : 0 }}>NFL</div><div className="team-grid">{nflTeams.map(t => <Link key={t.id} href={`/team/${t.id}`} className="team-chip" style={{ borderLeftColor:t.primary_color||'var(--faint)' }}>{t.team_abbr}</Link>)}</div></>}
          </>
        })()}
        {ats.length > 0 && <><div className="sec-head" style={{ marginTop:24 }}>ALL-TIMERS</div>{ats.slice(0,6).map(g => <Link key={g.id} href={`/notable/${g.id}`} className="game-row" style={{ padding:'8px 0' }}><div style={{ display:'flex', alignItems:'center', gap:8 }}><SportBadge sport={g.sport}/><span style={{ fontSize:13, color:'var(--ink)' }}>{g.title}</span></div><div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2, marginLeft:44 }}>{formatDate(g.game_date)}</div></Link>)}</>}
        {browseCities.length > 0 && <><div className="sec-head" style={{ marginTop:24 }}>CITIES</div><div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{browseCities.map(c => <Link key={c} href={`/city/${encodeURIComponent(c)}`} style={{ padding:'6px 12px', fontSize:11, fontFamily:'Arial,sans-serif', background:'var(--card)', border:'1px solid var(--faint)', color:'var(--ink)', textDecoration:'none' }}>{c}</Link>)}</div></>}
        {venues.length > 0 && <><div className="sec-head" style={{ marginTop:24 }}>{isGolf?'COURSES':'VENUES'}</div><div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{venues.slice(0,20).map(v => <Link key={v.id} href={`/venue/${v.id}`} style={{ padding:'6px 12px', fontSize:11, fontFamily:'Arial,sans-serif', background:'var(--card)', border:'1px solid var(--faint)', color:'var(--ink)', textDecoration:'none' }}>{v.venue_name}</Link>)}</div></>}
      </div>}
    </div>
  )
}
