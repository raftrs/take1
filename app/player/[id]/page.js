'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import BackButton from '@/components/BackButton'
import SportBadge from '@/components/SportBadge'

function MastersIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#006747" strokeWidth="1.5"><path d="M12 3C8 3 5 6 5 9c0 4 3 5 4 9h6c1-4 4-5 4-9 0-3-3-6-7-6z"/><path d="M9 18h6v2H9z"/></svg> }
function USOpenIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#003366" strokeWidth="1.5"><path d="M12 2l2 5h5l-4 3.5 1.5 5L12 13l-4.5 2.5L9 10.5 5 7h5z"/></svg> }
function OpenIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B4513" strokeWidth="1.5"><path d="M8 21h8M10 21V11M14 21V11M7 11h10l-2-8H9z"/></svg> }
function PGAIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a6c" strokeWidth="1.5"><path d="M12 2L4 8v6l8 8 8-8V8z"/></svg> }

const MAJOR_CONFIG = [
  { key: 'Masters', label: 'Masters', Icon: MastersIcon },
  { key: 'U.S. Open', label: 'U.S. Open', Icon: USOpenIcon },
  { key: 'The Open', label: 'The Open', Icon: OpenIcon },
  { key: 'PGA Championship', label: 'PGA Champ.', Icon: PGAIcon },
]

function getNFLPositionGroup(pos) {
  if (!pos) return 'other'
  const p = pos.toUpperCase()
  if (['QB'].includes(p)) return 'qb'
  if (['RB','FB','HB'].includes(p)) return 'rb'
  if (['WR','TE'].includes(p)) return 'wr'
  if (['DT','DE','DL','NT','EDGE','OLB','ILB','LB','MLB'].includes(p)) return 'def'
  if (['CB','SS','FS','S','DB'].includes(p)) return 'db'
  if (['K','PK'].includes(p)) return 'k'
  return 'other'
}

function getNFLCareerStats(player) {
  const group = getNFLPositionGroup(player.position)
  const ok = (v) => v != null && v !== 0 && v !== '0'
  switch (group) {
    case 'qb': return [{v:player.games_played,l:'GP'},{v:player.pass_yards_career?.toLocaleString(),l:'PASS YDS'},{v:player.pass_tds_career,l:'PASS TD'},{v:player.interceptions_thrown_career,l:'INT'},{v:player.passer_rating,l:'RTG'},{v:player.rush_yards_career?.toLocaleString(),l:'RUSH YDS'},{v:player.rush_tds_career,l:'RUSH TD'}].filter(x=>ok(x.v))
    case 'rb': return [{v:player.games_played,l:'GP'},{v:player.rush_yards_career?.toLocaleString(),l:'RUSH YDS'},{v:player.rush_tds_career,l:'RUSH TD'},{v:player.receptions_career,l:'REC'},{v:player.rec_yards_career?.toLocaleString(),l:'REC YDS'},{v:player.rec_tds_career,l:'REC TD'}].filter(x=>ok(x.v))
    case 'wr': return [{v:player.games_played,l:'GP'},{v:player.receptions_career,l:'REC'},{v:player.rec_yards_career?.toLocaleString(),l:'REC YDS'},{v:player.rec_tds_career,l:'REC TD'}].filter(x=>ok(x.v))
    case 'def': return [{v:player.games_played,l:'GP'},{v:player.tackles_career,l:'TACKLES'},{v:player.sacks_career,l:'SACKS'},{v:player.forced_fumbles_career,l:'FF'},{v:player.interceptions_career,l:'INT'}].filter(x=>ok(x.v))
    case 'db': return [{v:player.games_played,l:'GP'},{v:player.interceptions_career,l:'INT'},{v:player.tackles_career,l:'TACKLES'},{v:player.pass_deflections_career,l:'PD'},{v:player.forced_fumbles_career,l:'FF'}].filter(x=>ok(x.v))
    case 'k': return [{v:player.games_played,l:'GP'},{v:player.fg_made_career&&player.fg_attempted_career?`${player.fg_made_career}/${player.fg_attempted_career}`:null,l:'FG'},{v:player.xp_made_career,l:'XP'}].filter(x=>ok(x.v))
    default: return [{v:player.games_played,l:'GP'}].filter(x=>ok(x.v))
  }
}

function getNFLPlayoffStats(box, position) {
  const group = getNFLPositionGroup(position)
  const gp = box.length
  const sum = (key) => box.reduce((a, b) => a + (b[key] || 0), 0)
  const ok = (v) => v != null && v !== 0
  switch (group) {
    case 'qb': return [{v:gp,l:'GP'},{v:sum('pass_yards')?.toLocaleString(),l:'PASS YDS'},{v:sum('pass_tds'),l:'PASS TD'},{v:sum('interceptions_thrown'),l:'INT'},{v:sum('rush_yards'),l:'RUSH YDS'}].filter(x=>ok(x.v))
    case 'rb': return [{v:gp,l:'GP'},{v:sum('rush_yards')?.toLocaleString(),l:'RUSH YDS'},{v:sum('rush_tds'),l:'RUSH TD'},{v:sum('receptions'),l:'REC'},{v:sum('receiving_yards'),l:'REC YDS'}].filter(x=>ok(x.v))
    case 'wr': return [{v:gp,l:'GP'},{v:sum('receptions'),l:'REC'},{v:sum('receiving_yards')?.toLocaleString(),l:'REC YDS'},{v:sum('receiving_tds'),l:'REC TD'}].filter(x=>ok(x.v))
    case 'def': case 'db': return [{v:gp,l:'GP'},{v:sum('tackles'),l:'TACKLES'},{v:sum('sacks'),l:'SACKS'},{v:sum('def_interceptions'),l:'INT'},{v:sum('forced_fumbles'),l:'FF'}].filter(x=>ok(x.v))
    default: return [{v:gp,l:'GP'}]
  }
}

function nflGameLine(stats, pos) {
  if (!stats) return null
  const group = getNFLPositionGroup(pos)
  switch (group) {
    case 'qb': return `${stats.pass_yards||0} yds, ${stats.pass_tds||0} TD, ${stats.interceptions_thrown||0} INT`
    case 'rb': return `${stats.rush_yards||0} rush yds, ${stats.rush_tds||0} TD${stats.receptions?`, ${stats.receptions} rec`:''}`
    case 'wr': return `${stats.receptions||0} rec, ${stats.receiving_yards||0} yds, ${stats.receiving_tds||0} TD`
    case 'def': case 'db': return [stats.tackles&&`${stats.tackles} tkl`,stats.sacks&&`${stats.sacks} sack`,stats.def_interceptions&&`${stats.def_interceptions} INT`].filter(Boolean).join(', ')
    default: return null
  }
}

// Scrollable list container - consistent pattern for all long lists
function ScrollList({ children, maxH = 300 }) {
  return <div style={{ maxHeight: maxH, overflowY: 'auto', marginRight: -4, paddingRight: 4 }}>{children}</div>
}

export default function PlayerPage() {
  const { id } = useParams()
  const [player, setPlayer] = useState(null)
  const [gameLog, setGameLog] = useState([])
  const [allTimers, setAllTimers] = useState([])
  const [playoffAvg, setPlayoffAvg] = useState(null)
  const [nflPlayoffStats, setNflPlayoffStats] = useState(null)
  const [nflGameLog, setNflGameLog] = useState([])
  const [majorBreakdown, setMajorBreakdown] = useState(null)
  const [golfResults, setGolfResults] = useState([])
  const [storyMode, setStoryMode] = useState('encounters')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from('players').select('*').eq('id', id).single()
      if (!p) { setLoading(false); return }
      setPlayer(p)
      const sport = p.sport || 'basketball'

      if (sport === 'basketball') {
        const { data: bs } = await supabase.from('box_scores').select('nba_game_id,points,rebounds,assists,minutes,steals,blocks')
          .eq('player_name', p.player_name).order('nba_game_id', { ascending: false })
        if (bs?.length) {
          const tot = bs.reduce((a, b) => ({ pts:a.pts+(b.points||0), reb:a.reb+(b.rebounds||0), ast:a.ast+(b.assists||0), gp:a.gp+1 }), { pts:0, reb:0, ast:0, gp:0 })
          setPlayoffAvg({ ppg:(tot.pts/tot.gp).toFixed(1), rpg:(tot.reb/tot.gp).toFixed(1), apg:(tot.ast/tot.gp).toFixed(1), gp:tot.gp })
          const espnIds = [...new Set(bs.map(b => b.nba_game_id))]
          const { data: games } = await supabase.from('games').select('id,nba_game_id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,series_info')
            .in('nba_game_id', espnIds).order('game_date', { ascending: false })
          if (games) {
            setGameLog(games.map(g => ({ ...g, stats: bs.find(b => b.nba_game_id === g.nba_game_id) })))
            const gameIds = games.map(g => g.id).filter(Boolean)
            if (gameIds.length > 0) {
              // FIX: Only show tier 1 All-Timers
              const { data: at } = await supabase.from('notable_games').select('id,title,game_date,sport,tier')
                .in('game_id', gameIds).eq('tier', 1).order('game_date', { ascending: false })
              setAllTimers(at || [])
            }
          }
        }
      } else if (sport === 'football') {
        const { data: bs } = await supabase.from('nfl_box_scores').select('*').eq('player_name', p.player_name)
        if (bs?.length) {
          setNflPlayoffStats(getNFLPlayoffStats(bs, p.position))
          const espnIds = [...new Set(bs.map(b => b.espn_game_id))]
          const { data: games } = await supabase.from('games').select('id,nba_game_id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,series_info')
            .in('nba_game_id', espnIds).order('game_date', { ascending: false })
          if (games) {
            setNflGameLog(games.map(g => ({ ...g, stats: bs.find(b => b.espn_game_id === g.nba_game_id) })))
            const gameIds = games.map(g => g.id).filter(Boolean)
            if (gameIds.length > 0) {
              const { data: at } = await supabase.from('notable_games').select('id,title,game_date,sport,tier')
                .in('game_id', gameIds).eq('tier', 1).order('game_date', { ascending: false })
              setAllTimers(at || [])
            }
          }
        }
      } else if (sport === 'golf') {
        const { data: lb } = await supabase.from('golf_leaderboard').select('game_id,player_name,position,total_score')
          .eq('player_name', p.player_name).order('position')
        if (lb?.length) {
          const gameIds = lb.map(l => l.game_id).filter(Boolean)
          const { data: games } = await supabase.from('games').select('id,title,game_date,venue')
            .in('id', gameIds).order('game_date', { ascending: false })
          if (games) {
            const results = games.map(g => {
              const entry = lb.find(l => l.game_id === g.id)
              return { ...g, position: entry?.position, total_score: entry?.total_score }
            })
            setGolfResults(results)
            const breakdown = {}
            MAJOR_CONFIG.forEach(m => { breakdown[m.key] = 0 })
            results.forEach(r => {
              if (r.position === 1) {
                MAJOR_CONFIG.forEach(m => { if (r.title?.includes(m.key)) breakdown[m.key]++ })
              }
            })
            setMajorBreakdown(breakdown)
          }
        }
        const { data: notables } = await supabase.from('notable_games').select('id,title,game_date,sport,tier')
          .eq('sport', 'golf').eq('tier', 1).order('game_date', { ascending: false })
        if (notables) {
          const playerLower = p.player_name.toLowerCase()
          const lastName = playerLower.split(' ').pop()
          setAllTimers(notables.filter(n => {
            const t = (n.title || '').toLowerCase()
            return t.includes(playerLower) || t.includes(lastName)
          }))
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="loading">Loading...</div>
  if (!player) return <div className="empty">Player not found</div>

  const sport = player.sport || 'basketball'
  const isNBA = sport === 'basketball'
  const isNFL = sport === 'football'
  const isGolf = sport === 'golf'
  const activeGameLog = isNBA ? gameLog : isNFL ? nflGameLog : []
  const nflCareer = isNFL ? getNFLCareerStats(player) : []
  const firstName = player.first_name || player.player_name.split(' ')[0]

  return (
    <div>
      <BackButton />
      <div style={{ padding:20, borderBottom:'2px solid var(--rule)' }}>
        <div style={{ marginBottom:2 }}><SportBadge sport={sport}/></div>
        <div style={{ fontSize:26, color:'var(--ink)', lineHeight:1.15, marginTop:6 }}>{player.player_name}</div>
        <div className="sans" style={{ fontSize:11, color:'var(--dim)', marginTop:6 }}>{[player.position, player.height, player.experience].filter(Boolean).join(' \u00B7 ')}</div>
        {player.draft_info && <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{player.draft_info}</div>}
        <div style={{ marginTop:8 }}>
          <span className="sans" style={{ fontSize:10, fontWeight:600, letterSpacing:1, padding:'3px 8px', background:player.active?'rgba(181,86,58,0.08)':'var(--surface)', color:player.active?'var(--copper)':'var(--dim)', border:`1px solid ${player.active?'var(--copper)':'var(--faint)'}` }}>{player.active?'ACTIVE':'RETIRED'}</span>
          {player.debut_year && <span className="sans" style={{ fontSize:10, color:'var(--dim)', marginLeft:8 }}>Since {player.debut_year}</span>}
        </div>
      </div>

      {/* NBA CAREER STATS */}
      {isNBA && player.ppg && (<div style={{ padding:'14px 20px', borderBottom:'1px solid var(--faint)' }}>
        <div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:2, fontWeight:600, marginBottom:10 }}>CAREER STATS</div>
        <div style={{ display:'flex' }}>
          {[{v:player.ppg,l:'PPG'},{v:player.rpg,l:'RPG'},{v:player.apg,l:'APG'},{v:player.spg,l:'SPG'},{v:player.fg_pct?`${player.fg_pct}%`:null,l:'FG%'}].filter(s=>s.v!=null).map((s,i,a) =>
            <div key={i} style={{ flex:1, textAlign:'center', borderRight:i<a.length-1?'1px solid var(--faint)':'none' }}><div style={{ fontSize:20, color:'var(--ink)' }}>{s.v}</div><div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:1, fontWeight:600, marginTop:2 }}>{s.l}</div></div>
          )}
        </div>
      </div>)}

      {/* NBA PLAYOFF STATS */}
      {isNBA && playoffAvg && (<div style={{ padding:'14px 20px', borderBottom:'1px solid var(--faint)' }}>
        <div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:2, fontWeight:600, marginBottom:10 }}>PLAYOFF STATS ({playoffAvg.gp} games)</div>
        <div style={{ display:'flex' }}>
          {[{v:playoffAvg.ppg,l:'PPG'},{v:playoffAvg.rpg,l:'RPG'},{v:playoffAvg.apg,l:'APG'}].map((s,i,a) =>
            <div key={i} style={{ flex:1, textAlign:'center', borderRight:i<a.length-1?'1px solid var(--faint)':'none' }}><div style={{ fontSize:20, color:'var(--ink)' }}>{s.v}</div><div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:1, fontWeight:600, marginTop:2 }}>{s.l}</div></div>
          )}
        </div>
      </div>)}

      {/* NFL CAREER STATS */}
      {isNFL && nflCareer.length > 0 && (<div style={{ padding:'14px 20px', borderBottom:'1px solid var(--faint)' }}>
        <div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:2, fontWeight:600, marginBottom:10 }}>CAREER STATS</div>
        <div style={{ display:'flex', flexWrap:'wrap' }}>
          {nflCareer.map((s,i,a) =>
            <div key={i} style={{ flex:'1 0 auto', minWidth:60, textAlign:'center', padding:'4px 8px', borderRight:i<a.length-1?'1px solid var(--faint)':'none' }}>
              <div style={{ fontSize:18, color:'var(--ink)' }}>{s.v}</div>
              <div className="sans" style={{ fontSize:8, color:'var(--dim)', letterSpacing:1, fontWeight:600, marginTop:2 }}>{s.l}</div>
            </div>
          )}
        </div>
      </div>)}

      {/* NFL PLAYOFF STATS */}
      {isNFL && nflPlayoffStats && nflPlayoffStats.length > 0 && (<div style={{ padding:'14px 20px', borderBottom:'1px solid var(--faint)' }}>
        <div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:2, fontWeight:600, marginBottom:10 }}>PLAYOFF STATS</div>
        <div style={{ display:'flex', flexWrap:'wrap' }}>
          {nflPlayoffStats.map((s,i,a) =>
            <div key={i} style={{ flex:'1 0 auto', minWidth:60, textAlign:'center', padding:'4px 8px', borderRight:i<a.length-1?'1px solid var(--faint)':'none' }}>
              <div style={{ fontSize:18, color:'var(--ink)' }}>{s.v}</div>
              <div className="sans" style={{ fontSize:8, color:'var(--dim)', letterSpacing:1, fontWeight:600, marginTop:2 }}>{s.l}</div>
            </div>
          )}
        </div>
      </div>)}

      {/* GOLF MAJOR WINS BREAKDOWN */}
      {isGolf && majorBreakdown && player.major_wins > 0 && (<div style={{ padding:'14px 20px', borderBottom:'1px solid var(--faint)' }}>
        <div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:2, fontWeight:600, marginBottom:14 }}>MAJOR CHAMPIONSHIPS ({player.major_wins})</div>
        <div style={{ display:'flex', justifyContent:'space-around' }}>
          {MAJOR_CONFIG.map(m => (
            <div key={m.key} style={{ textAlign:'center', opacity: majorBreakdown[m.key] > 0 ? 1 : 0.3 }}>
              <m.Icon />
              <div style={{ fontSize:22, color: majorBreakdown[m.key] > 0 ? 'var(--ink)' : 'var(--dim)', marginTop:4, lineHeight:1 }}>{majorBreakdown[m.key]}</div>
              <div className="sans" style={{ fontSize:8, color:'var(--dim)', letterSpacing:0.5, fontWeight:600, marginTop:4, maxWidth:60, lineHeight:1.2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>)}

      {/* GOLF CAREER STATS */}
      {isGolf && player.majors_played && (<div style={{ padding:'14px 20px', borderBottom:'1px solid var(--faint)' }}>
        <div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:2, fontWeight:600, marginBottom:10 }}>CAREER STATS</div>
        <div style={{ display:'flex' }}>
          {[{v:player.majors_played,l:'MAJORS'},{v:player.major_wins||0,l:'WINS'},{v:player.major_top_3||0,l:'TOP 3'},{v:player.major_top_10||0,l:'TOP 10'}].map((s,i,a) =>
            <div key={i} style={{ flex:1, textAlign:'center', borderRight:i<a.length-1?'1px solid var(--faint)':'none' }}><div style={{ fontSize:20, color:'var(--ink)' }}>{s.v}</div><div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:1, fontWeight:600, marginTop:2 }}>{s.l}</div></div>
          )}
        </div>
      </div>)}

      {/* ALL-TIMERS - scrollable */}
      {allTimers.length > 0 && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
        <div className="sec-head">ALL-TIMERS ({allTimers.length})</div>
        <ScrollList maxH={280}>
          {allTimers.map(g => <Link key={g.id} href={`/notable/${g.id}`} className="game-row" style={{ padding:'8px 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span className="at-badge-sm">&#9733;</span>
              <div>
                <div style={{ fontSize:13, color:'var(--ink)' }}>{g.title}</div>
                <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:1 }}>{formatDate(g.game_date)}</div>
              </div>
            </div>
          </Link>)}
        </ScrollList>
      </div></>)}

      {/* ENCOUNTERS / REFLECTIONS - ABOVE game log */}
      <hr className="sec-rule"/><hr className="sec-rule-thin"/>
      <div style={{ padding:20 }}>
        <div className="att-toggle" style={{ marginBottom:16 }}>
          <button className={`att-opt${storyMode==='encounters'?' on':''}`} onClick={() => setStoryMode('encounters')}>Encounters</button>
          <button className={`att-opt${storyMode==='reflections'?' on':''}`} onClick={() => setStoryMode('reflections')}>Reflections</button>
        </div>
        {storyMode === 'encounters' ? (
          <>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:12, lineHeight:1.6 }}>
              That time you ran into {firstName} at the airport. The autograph at the hotel lobby. The nod from across the restaurant.
            </div>
            <textarea className="story-textarea" placeholder={`I was at the grocery store and ${firstName} was in the checkout line next to me...`}/>
          </>
        ) : (
          <>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:12, lineHeight:1.6 }}>
              A memory, a moment, a feeling. What {firstName} means to you as a fan and why.
            </div>
            <textarea className="story-textarea" placeholder={`The thing about ${firstName} that people don't talk about enough is...`}/>
          </>
        )}
      </div>

      {/* NBA/NFL GAME LOG - scrollable */}
      {activeGameLog.length > 0 && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
        <div className="sec-head">PLAYOFF GAMES ({activeGameLog.length})</div>
        <ScrollList maxH={340}>
          {activeGameLog.map(g => <Link key={g.id} href={`/game/${g.id}`} className="game-row" style={{ padding:'10px 0' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontSize:14, color:'var(--ink)' }}>{g.away_team_abbr} {g.away_score} / {g.home_score} {g.home_team_abbr}</span>
              <span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{formatDate(g.game_date)}</span>
            </div>
            {g.series_info && <div className="sans" style={{ fontSize:10, color:'var(--copper)', marginTop:2 }}>{g.series_info}</div>}
            {isNBA && g.stats && <div className="sans" style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{g.stats.points} pts &middot; {g.stats.rebounds} reb &middot; {g.stats.assists} ast{g.stats.steals?` \u00B7 ${g.stats.steals} stl`:''}{g.stats.blocks?` \u00B7 ${g.stats.blocks} blk`:''}</div>}
            {isNFL && g.stats && <div className="sans" style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{nflGameLine(g.stats, player.position)}</div>}
          </Link>)}
        </ScrollList>
      </div></>)}

      {/* GOLF TOURNAMENT HISTORY - scrollable */}
      {isGolf && golfResults.length > 0 && (<><hr className="sec-rule"/><hr className="sec-rule-thin"/><div style={{ padding:20 }}>
        <div className="sec-head">MAJOR RESULTS ({golfResults.length})</div>
        <ScrollList maxH={340}>
          {golfResults.map(g => <Link key={g.id} href={`/game/${g.id}`} className="game-row" style={{ padding:'8px 0' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontSize:13, color:'var(--ink)' }}>{g.title}</span>
              <span className="sans" style={{ fontSize:10, color: g.position === 1 ? 'var(--gold)' : 'var(--dim)', fontWeight: g.position === 1 ? 700 : 400 }}>
                {g.position === 1 ? 'W' : `${g.position}`}
              </span>
            </div>
            {g.venue && <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{g.venue}</div>}
          </Link>)}
        </ScrollList>
      </div></>)}

      <div style={{ height:80 }}></div>
    </div>
  )
}
