'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate, capType, sortPerformers, getWinner, showScore, normalizeCity } from '@/lib/utils'
import BackButton from '@/components/BackButton'
import SportBadge from '@/components/SportBadge'
import YourCall from '@/components/YourCall'
import GameNav from '@/components/GameNav'
import TopLogo from '@/components/TopLogo'
import WeatherIntro from '@/components/WeatherIntro'
import WeatherDisplay from '@/components/WeatherDisplay'
import StoryOverlay from '@/components/StoryOverlay'

export default function NotablePage() {
  const { id } = useParams()
  const [game, setGame] = useState(null)
  const [box, setBox] = useState([])
  const [golf, setGolf] = useState([])
  const [teamMap, setTeamMap] = useState({})
  const [venueId, setVenueId] = useState(null)
  const [playerMap, setPlayerMap] = useState({})
  const [showBox, setShowBox] = useState(false)
  const [weather, setWeather] = useState(null)
  const [showStory, setShowStory] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: g } = await supabase.from('notable_games').select('*').eq('id', id).single()
      if (!g) { setLoading(false); return }
      setGame(g)
      const sp = g.sport || 'basketball'
      const abbrs = [g.home_team_abbr, g.away_team_abbr].filter(Boolean)
      if (abbrs.length) {
        const { data: t } = await supabase.from('teams').select('id,team_abbr,sport').eq('sport', sp).in('team_abbr', abbrs)
        if (t) { const m = {}; t.forEach(x => m[x.team_abbr] = x.id); setTeamMap(m) }
      }
      if (g.venue) {
        const { data: v } = await supabase.from('venues').select('id').eq('venue_name', g.venue).limit(1)
        if (v?.[0]) setVenueId(v[0].id)
      }
      if (g.game_id) {
        const { data: linked } = await supabase.from('games').select('id,nba_game_id,weather').eq('id', g.game_id).single()
        if (linked?.weather) {
          setWeather(typeof linked.weather === 'string' ? JSON.parse(linked.weather) : linked.weather)
        }
        if (linked?.nba_game_id) {
          if (sp === 'basketball') {
            const { data: bs } = await supabase.from('box_scores').select('*').eq('nba_game_id', linked.nba_game_id).order('points', { ascending: false })
            setBox(bs || [])
            if (bs?.length) {
              const names = [...new Set(bs.map(b => b.player_name))]
              const { data: p } = await supabase.from('players').select('id,player_name').in('player_name', names)
              if (p) { const m = {}; p.forEach(x => m[x.player_name] = x.id); setPlayerMap(m) }
            }
          } else if (sp === 'football') {
            const { data: bs } = await supabase.from('nfl_box_scores').select('*').eq('espn_game_id', linked.nba_game_id)
            setBox(bs || [])
            if (bs?.length) {
              const names = [...new Set(bs.map(b => b.player_name))]
              const { data: p } = await supabase.from('players').select('id,player_name').in('player_name', names)
              if (p) { const m = {}; p.forEach(x => m[x.player_name] = x.id); setPlayerMap(m) }
            }
          }
        }
        if (sp === 'baseball' && g.game_id) {
          const { data: bs } = await supabase.from('mlb_box_scores').select('*').eq('game_id', g.game_id)
          setBox(bs || [])
          if (bs?.length) {
            const names = [...new Set(bs.map(b => b.player_name))]
            const { data: p } = await supabase.from('players').select('id,player_name').in('player_name', names)
            if (p) { const pm = {}; p.forEach(x => pm[x.player_name] = x.id); setPlayerMap(prev => ({...prev, ...pm})) }
          }
        }
        if (sp === 'golf') {
          const { data: lb } = await supabase.from('golf_leaderboard').select('*').eq('game_id', g.game_id).order('position')
          setGolf(lb || [])
          if (lb?.length) {
            const names = [...new Set(lb.map(b => b.player_name))]
            const { data: p } = await supabase.from('players').select('id,player_name').in('player_name', names)
            if (p) { const pm = {}; p.forEach(x => pm[x.player_name] = x.id); setPlayerMap(prev => ({...prev, ...pm})) }
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="loading">Loading...</div>
  if (!game) return <div className="empty">Game not found</div>
  const sp = game.sport || 'basketball'
  const isGolf = sp === 'golf'
  const isTier1 = game.tier === 1
  const winner = getWinner(game.home_team_abbr, game.away_team_abbr, game.home_score, game.away_score)
  const TL = ({ a }) => teamMap[a] ? <Link href={`/team/${teamMap[a]}`} className="team-link">{a}</Link> : <span>{a}</span>
  const VL = () => venueId ? <Link href={`/venue/${venueId}`} className="copper-link">{game.venue}</Link> : <span>{game.venue}</span>
  const CL = () => game.venue_city ? <Link href={`/city/${encodeURIComponent(normalizeCity(game.venue_city))}`} className="copper-link">{game.venue_city}</Link> : null
  const PL = ({ n }) => playerMap[n] ? <Link href={`/player/${playerMap[n]}`} className="copper-link">{n}</Link> : <span className="copper-link" onClick={() => window.location.href=`/search?q=${encodeURIComponent(n)}`} style={{cursor:'pointer'}}>{n}</span>

  let rawPerf = []
  if (sp === 'basketball') rawPerf = box.filter(p => p.points >= 15).slice(0, 8)
  else if (sp === 'football') {
    const teams = [game.away_team_abbr, game.home_team_abbr].filter(Boolean)
    const leaders = []
    teams.forEach(team => {
      const tb = box.filter(b => b.team_abbr === team)
      const passLdr = tb.filter(r => (r.pass_yards||0) > 0).sort((a,b) => (b.pass_yards||0) - (a.pass_yards||0))[0]
      const rushLdr = tb.filter(r => (r.rush_yards||0) > 0).sort((a,b) => (b.rush_yards||0) - (a.rush_yards||0))[0]
      const recLdr = tb.filter(r => (r.receiving_yards||0) > 0).sort((a,b) => (b.receiving_yards||0) - (a.receiving_yards||0))[0]
      if (passLdr) leaders.push(passLdr)
      if (rushLdr) leaders.push(rushLdr)
      if (recLdr && recLdr.player_name !== rushLdr?.player_name) leaders.push(recLdr)
    })
    rawPerf = leaders
  } else if (sp === 'baseball') {
    const teams = [game.away_team_abbr, game.home_team_abbr].filter(Boolean)
    const leaders = []
    teams.forEach(team => {
      const tb = box.filter(b => b.team_abbr === team)
      const hitLdr = tb.filter(r => (r.hits||0) > 0 && !(r.innings_pitched > 0)).sort((a,b) => (b.hits||0)+(b.rbi||0) - (a.hits||0)-(a.rbi||0))[0]
      const hrLdr = tb.filter(r => (r.home_runs||0) > 0).sort((a,b) => (b.home_runs||0) - (a.home_runs||0))[0]
      const pitchLdr = tb.filter(r => (r.innings_pitched||0) > 0).sort((a,b) => (b.innings_pitched||0) - (a.innings_pitched||0))[0]
      if (hitLdr) leaders.push(hitLdr)
      if (hrLdr && hrLdr.player_name !== hitLdr?.player_name) leaders.push(hrLdr)
      if (pitchLdr) leaders.push(pitchLdr)
    })
    rawPerf = leaders
  }
  const perfs = sp === 'football' ? rawPerf : sortPerformers(rawPerf, winner)

  function pS(p) {
    if (sp === 'basketball') return { big:p.points, label:'PTS', sub:`${p.rebounds} reb \u00B7 ${p.assists} ast` }
    if (sp === 'baseball') {
      if ((p.innings_pitched||0) > 0) return { big:p.innings_pitched, label:'IP', sub:`${p.strikeouts||0} K, ${p.earned_runs||0} ER` }
      if ((p.home_runs||0) > 0) return { big:p.home_runs, label:'HR', sub:`${p.hits||0} H, ${p.rbi||0} RBI` }
      return { big:p.hits||0, label:'H', sub:`${p.rbi||0} RBI, ${p.runs||0} R` }
    }
    if ((p.pass_yards||0)>50) return { big:p.pass_yards, label:'PASS YDS', sub:`${p.pass_tds||0} TD, ${p.interceptions_thrown||0} INT` }
    if ((p.rush_yards||0)>20) return { big:p.rush_yards, label:'RUSH YDS', sub:`${p.rush_tds||0} TD` }
    if ((p.receiving_yards||0)>20) return { big:p.receiving_yards, label:'REC YDS', sub:`${p.receptions||0} rec` }
    if ((p.sacks||0)>0) return { big:p.sacks, label:'SACKS', sub:`${p.tackles||0} tkl` }
    return { big:p.def_interceptions||0, label:'INT', sub:'' }
  }

  return (
    <div>
      <TopLogo />
      <BackButton />
      <GameNav />
      <WeatherIntro weather={weather} sport={sp} venue={game.venue} />
      <div style={{ padding:'0 20px', marginTop:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          {/* FIX #53: Only show ALL-TIMER badge for tier 1 */}
          {isTier1 && <span className="at-badge-sm">&#9733; ALL-TIMER</span>}
          <SportBadge sport={sp}/>
        </div>
        <div style={{ fontSize:26, color:'var(--ink)', lineHeight:1.15, marginBottom:14 }}>{game.title}</div>
        {!isGolf && (game.away_score != null && game.home_score != null) && (
          <div className="scoreboard">
            <div className="sb-team"><div className="sb-abbr"><TL a={game.away_team_abbr}/></div><div className="sb-score">{game.away_score}</div></div>
            <div className="sb-divider"><div className="sb-dash"></div><div className="sb-final">FINAL</div></div>
            <div className="sb-team"><div className="sb-abbr"><TL a={game.home_team_abbr}/></div><div className="sb-score">{game.home_score}</div></div>
          </div>
        )}
        <div className="game-meta">
          <div>{formatDate(game.game_date)}{game.game_type ? ` \u00B7 ${capType(game.game_type)}` : ''}</div>
          {game.venue && <div><VL/>{game.venue_city && <> <span style={{color:'var(--dim)'}}>&middot;</span> <CL/></>}</div>}
          <WeatherDisplay weather={weather} sport={sp} />
        </div>
        {game.description && <div style={{ fontSize:15, color:'var(--text)', lineHeight:1.85, marginTop:16, borderLeft:'3px solid var(--gold)', paddingLeft:16 }}>{game.description}</div>}
        <YourCall gameId={game.game_id || game.id} notableGameId={game.id} onLogged={() => setShowStory(true)} />
      </div>
      {showStory && <StoryOverlay game={game} onSave={async (story) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) await supabase.from('user_games').update({ story }).eq('user_id', user.id).eq('game_id', game.game_id || game.id)
        setShowStory(false)
      }} onSkip={() => setShowStory(false)} />}

      {perfs.length > 0 && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/>
        <div style={{ padding:'20px 0 0 20px' }}><div className="sec-head">{sp === 'football' ? 'STAT LEADERS' : 'KEY PERFORMERS'}</div>
          <div className="perf-scroll">{perfs.map((p,i) => { const s = pS(p); return (
            <div key={i} className="perf-card" onClick={() => {
              if (playerMap[p.player_name]) window.location.href=`/player/${playerMap[p.player_name]}`
              else window.location.href=`/search?q=${encodeURIComponent(p.player_name)}`
            }} style={{ cursor:'pointer' }}>
              <div className="perf-name">{p.player_name}</div><div className="perf-big">{s.big}</div><div className="perf-label">{s.label}</div><div className="perf-sub">{s.sub}</div><div className="perf-team">{p.team_abbr}</div>
            </div>)})}</div></div></>)}

      {sp === 'basketball' && box.length > 0 && (<><hr className="sec-rule" style={{marginTop:16}}/><hr className="sec-rule-thin"/><div style={{padding:20}}>
        <div className="box-toggle" onClick={() => setShowBox(!showBox)}>{showBox ? 'Hide box score \u2191':'View full box score \u2193'}</div>
        {showBox && [game.away_team_abbr, game.home_team_abbr].filter(Boolean).map(a => {
          const rows = box.filter(b => b.team_abbr === a); if (!rows.length) return null
          return <div key={a}><div className="box-team-label">{a}</div><table className="box-table"><thead><tr><th style={{textAlign:'left'}}>Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>FG</th><th>3PT</th></tr></thead>
          <tbody>{rows.map((p,i) => <tr key={i}><td><PL n={p.player_name}/></td><td>{p.minutes}</td><td className="pts">{p.points}</td><td>{p.rebounds}</td><td>{p.assists}</td><td>{p.fg_made}-{p.fg_attempted}</td><td>{p.tp_made}-{p.tp_attempted}</td></tr>)}</tbody></table></div>
        })}</div></>)}

      {sp === 'football' && box.length > 0 && (<><hr className="sec-rule" style={{marginTop:16}}/><hr className="sec-rule-thin"/><div style={{padding:20}}>
        <div className="box-toggle" onClick={() => setShowBox(!showBox)}>{showBox ? 'Hide stats \u2191':'View full stats \u2193'}</div>
        {showBox && [game.away_team_abbr, game.home_team_abbr].filter(Boolean).map(a => {
          const rows = box.filter(b => b.team_abbr === a); if (!rows.length) return null
          const pass=rows.filter(r=>(r.pass_yards||0)>0).sort((x,y)=>(y.pass_yards||0)-(x.pass_yards||0))
          const rush=rows.filter(r=>(r.rush_yards||0)>0).sort((x,y)=>(y.rush_yards||0)-(x.rush_yards||0))
          const rec=rows.filter(r=>(r.receiving_yards||0)>0).sort((x,y)=>(y.receiving_yards||0)-(x.receiving_yards||0))
          return <div key={a}><div className="box-team-label">{a}</div>
            {pass.length>0&&<table className="box-table"><thead><tr><th style={{textAlign:'left'}}>Passing</th><th>C/A</th><th>YDS</th><th>TD</th><th>INT</th></tr></thead><tbody>{pass.map((p,i)=><tr key={i}><td><PL n={p.player_name}/></td><td>{p.pass_completions}/{p.pass_attempts}</td><td className="pts">{p.pass_yards}</td><td>{p.pass_tds}</td><td>{p.interceptions_thrown}</td></tr>)}</tbody></table>}
            {rush.length>0&&<table className="box-table"><thead><tr><th style={{textAlign:'left'}}>Rushing</th><th>ATT</th><th>YDS</th><th>TD</th></tr></thead><tbody>{rush.map((p,i)=><tr key={i}><td><PL n={p.player_name}/></td><td>{p.rush_attempts}</td><td className="pts">{p.rush_yards}</td><td>{p.rush_tds}</td></tr>)}</tbody></table>}
            {rec.length>0&&<table className="box-table"><thead><tr><th style={{textAlign:'left'}}>Receiving</th><th>REC</th><th>YDS</th><th>TD</th></tr></thead><tbody>{rec.map((p,i)=><tr key={i}><td><PL n={p.player_name}/></td><td>{p.receptions}</td><td className="pts">{p.receiving_yards}</td><td>{p.receiving_tds}</td></tr>)}</tbody></table>}
          </div>})}</div></>)}

      {isGolf && golf.length > 0 && (<><hr className="sec-rule" style={{marginTop:16}}/><hr className="sec-rule-thin"/><div style={{padding:20}}>
        <div className="sec-head">LEADERBOARD</div>
        <table className="box-table"><thead><tr><th>Pos</th><th style={{textAlign:'left'}}>Player</th><th>R1</th><th>R2</th><th>R3</th><th>R4</th><th>Tot</th></tr></thead>
        <tbody>{golf.slice(0,20).map((p,i)=><tr key={i}><td>{p.position}</td><td style={{textAlign:'left'}}><PL n={p.player_name}/></td><td>{p.round_1}</td><td>{p.round_2}</td><td>{p.round_3}</td><td>{p.round_4}</td><td className="pts">{p.total_score}</td></tr>)}</tbody></table>
      </div></>)}

      {sp === 'baseball' && box.length > 0 && (<><hr className="sec-rule" style={{marginTop:16}}/><hr className="sec-rule-thin"/><div style={{padding:20}}>
        <div className="box-toggle" onClick={() => setShowBox(!showBox)}>{showBox ? 'Hide box score \u2191':'View full box score \u2193'}</div>
        {showBox && [game.away_team_abbr, game.home_team_abbr].filter(Boolean).map(a => {
          const rows = box.filter(b => b.team_abbr === a); if (!rows.length) return null
          const pitchers = rows.filter(r => r.role === 'pitcher' || (r.innings_pitched && r.innings_pitched > 0)).sort((x,y) => (y.innings_pitched||0) - (x.innings_pitched||0))
          const hitters = rows.filter(r => r.role !== 'pitcher' && !(r.innings_pitched > 0)).sort((x,y) => (y.hits||0) - (x.hits||0))
          return <div key={a}><div className="box-team-label">{a}</div>
            {hitters.length>0 && <table className="box-table"><thead><tr><th style={{textAlign:'left'}}>Batting</th><th>AB</th><th>H</th><th>R</th><th>RBI</th><th>HR</th><th>BB</th></tr></thead><tbody>{hitters.map((p,i)=><tr key={i}><td><PL n={p.player_name}/></td><td>{p.at_bats}</td><td className="pts">{p.hits}</td><td>{p.runs}</td><td>{p.rbi}</td><td>{p.home_runs}</td><td>{p.walks}</td></tr>)}</tbody></table>}
            {pitchers.length>0 && <table className="box-table"><thead><tr><th style={{textAlign:'left'}}>Pitching</th><th>IP</th><th>H</th><th>R</th><th>ER</th><th>K</th><th>BB</th></tr></thead><tbody>{pitchers.map((p,i)=><tr key={i}><td><PL n={p.player_name}/></td><td>{p.innings_pitched}</td><td>{p.hits_allowed}</td><td>{p.runs_allowed}</td><td className="pts">{p.earned_runs}</td><td>{p.strikeouts}</td><td>{p.walks_allowed}</td></tr>)}</tbody></table>}
          </div>})}</div></>)}

      {Array.isArray(game.collections) && game.collections.length > 0 && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/>
        <div style={{ padding:20 }}><div className="sec-head">COLLECTIONS</div>
          <div>{game.collections.map(c => <Link key={c} href={`/collection/${encodeURIComponent(c)}`} className="coll-tag">{c}</Link>)}</div>
        </div></>)}
      <GameNav position="bottom" />
      <div style={{ height:80 }}></div>
    </div>
  )
}
