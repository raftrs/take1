#!/usr/bin/env node
// Backfill box scores for notable games that have ESPN IDs but no box score data
// Run: cd ~/Downloads/raftrs-app && node ~/Downloads/backfill-notable-boxscores.js

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
  'https://wnvbncbyrhbkbburzvzy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndudmJuY2J5cmhia2JidXJ6dnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjY1NzEsImV4cCI6MjA5MDg0MjU3MX0.xt-8x-fqxKs9KfgkuVCBaVFos0ZHZ2rKEFu4T5VABsc'
)

const delay = ms => new Promise(r => setTimeout(r, ms))

async function fetchESPN(sport, espnId) {
  const sportMap = { basketball: 'basketball/nba', football: 'football/nfl', baseball: 'baseball/mlb' }
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sportMap[sport]}/summary?event=${espnId}`
  try {
    const res = await fetch(url)
    if (!res.ok) { console.log(`  ESPN ${res.status} for ${espnId}`); return null }
    return await res.json()
  } catch(e) { console.log(`  ESPN error: ${e.message}`); return null }
}

function parseNBA(data, espnId) {
  const rows = []
  for (const team of (data?.boxscore?.players || [])) {
    const teamAbbr = team.team?.abbreviation
    for (const sg of (team.statistics || [])) {
      for (const ath of (sg.athletes || [])) {
        const s = {}; const labels = sg.labels || []; const vals = ath.stats || []
        labels.forEach((l, i) => { s[l.toLowerCase()] = vals[i] })
        const fg = (s.fg||'0-0').split('-'), tp = (s['3pt']||'0-0').split('-'), ft = (s.ft||'0-0').split('-')
        rows.push({
          nba_game_id: espnId, player_name: ath.athlete?.displayName, team_abbr: teamAbbr,
          minutes: s.min||null, points: parseInt(s.pts)||0, rebounds: parseInt(s.reb)||0,
          assists: parseInt(s.ast)||0, steals: parseInt(s.stl)||0, blocks: parseInt(s.blk)||0,
          turnovers: parseInt(s.to)||0, fg_made: parseInt(fg[0])||0, fg_attempted: parseInt(fg[1])||0,
          tp_made: parseInt(tp[0])||0, tp_attempted: parseInt(tp[1])||0,
          ft_made: parseInt(ft[0])||0, ft_attempted: parseInt(ft[1])||0, plus_minus: parseInt(s['+/-'])||0,
        })
      }
    }
  }
  return rows
}

function parseNFL(data, espnId) {
  const rows = []
  for (const team of (data?.boxscore?.players || [])) {
    const teamAbbr = team.team?.abbreviation
    for (const sg of (team.statistics || [])) {
      const cat = sg.name
      for (const ath of (sg.athletes || [])) {
        const s = {}; const labels = sg.labels || []; const vals = ath.stats || []
        labels.forEach((l, i) => { s[l.toLowerCase()] = vals[i] })
        const catt = (s['c/att']||'0/0').split('/')
        rows.push({
          espn_game_id: espnId, player_name: ath.athlete?.displayName, team_abbr: teamAbbr,
          position: cat,
          pass_completions: cat==='passing' ? parseInt(catt[0])||0 : null,
          pass_attempts: cat==='passing' ? parseInt(catt[1])||0 : null,
          pass_yards: cat==='passing' ? parseInt(s.yds)||0 : null,
          pass_tds: cat==='passing' ? parseInt(s.td)||0 : null,
          interceptions_thrown: cat==='passing' ? parseInt(s.int)||0 : null,
          rush_attempts: cat==='rushing' ? parseInt(s.car)||0 : null,
          rush_yards: cat==='rushing' ? parseInt(s.yds)||0 : null,
          rush_tds: cat==='rushing' ? parseInt(s.td)||0 : null,
          receptions: cat==='receiving' ? parseInt(s.rec)||0 : null,
          receiving_yards: cat==='receiving' ? parseInt(s.yds)||0 : null,
          receiving_tds: cat==='receiving' ? parseInt(s.td)||0 : null,
          targets: cat==='receiving' ? parseInt(s.tgts)||0 : null,
        })
      }
    }
  }
  return rows
}

function parseMLB(data, espnId) {
  const rows = []
  for (const team of (data?.boxscore?.players || [])) {
    const teamAbbr = team.team?.abbreviation
    for (const sg of (team.statistics || [])) {
      const isPitching = sg.name === 'pitching'
      for (const ath of (sg.athletes || [])) {
        const s = {}; const labels = sg.labels || []; const vals = ath.stats || []
        labels.forEach((l, i) => { s[l.toLowerCase()] = vals[i] })
        rows.push({
          espn_game_id: espnId, player_name: ath.athlete?.displayName, team_abbr: teamAbbr,
          is_pitcher: isPitching,
          at_bats: !isPitching ? parseInt(s.ab)||0 : null,
          hits: !isPitching ? parseInt(s.h)||0 : null,
          runs: !isPitching ? parseInt(s.r)||0 : null,
          rbi: !isPitching ? parseInt(s.rbi)||0 : null,
          home_runs: !isPitching ? parseInt(s.hr)||0 : null,
          walks: !isPitching ? parseInt(s.bb)||0 : null,
          strikeouts: !isPitching ? parseInt(s.so||s.k)||0 : null,
          innings_pitched: isPitching ? s.ip||null : null,
          earned_runs: isPitching ? parseInt(s.er)||0 : null,
          strikeouts_pitched: isPitching ? parseInt(s.k||s.so)||0 : null,
          walks_allowed: isPitching ? parseInt(s.bb)||0 : null,
          hits_allowed: isPitching ? parseInt(s.h)||0 : null,
        })
      }
    }
  }
  return rows
}

async function main() {
  // Get all notable games with linked games that have ESPN IDs
  const { data: notables, error } = await supabase
    .from('notable_games')
    .select('id, title, sport, game_id')
    .not('game_id', 'is', null)
    .in('sport', ['basketball', 'football', 'baseball'])
    .order('sport')

  if (error) { console.error('Failed to fetch notables:', error.message); return }
  console.log(`Found ${notables.length} notable games with links\n`)

  // Get linked games with ESPN IDs
  const gameIds = notables.map(n => n.game_id)
  const { data: games } = await supabase
    .from('games')
    .select('id, nba_game_id, sport')
    .in('id', gameIds)
    .not('nba_game_id', 'is', null)

  const gameMap = {}
  games.forEach(g => { gameMap[g.id] = g })
  console.log(`${games.length} linked games have ESPN IDs\n`)

  const stats = { basketball: { checked: 0, fetched: 0, inserted: 0, skipped: 0, failed: 0 },
                  football: { checked: 0, fetched: 0, inserted: 0, skipped: 0, failed: 0 },
                  baseball: { checked: 0, fetched: 0, inserted: 0, skipped: 0, failed: 0 } }

  for (const n of notables) {
    const linked = gameMap[n.game_id]
    if (!linked) continue
    const espnId = linked.nba_game_id
    const sport = n.sport
    stats[sport].checked++

    // Check if box scores already exist
    const table = sport === 'basketball' ? 'box_scores' : sport === 'football' ? 'nfl_box_scores' : 'mlb_box_scores'
    const idCol = sport === 'basketball' ? 'nba_game_id' : 'espn_game_id'
    const { count } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq(idCol, espnId)
    
    if (count > 0) {
      stats[sport].skipped++
      continue
    }

    console.log(`[${sport}] Fetching: ${n.title} (ESPN ${espnId})`)
    const data = await fetchESPN(sport, espnId)
    if (!data) { stats[sport].failed++; await delay(500); continue }

    let rows
    if (sport === 'basketball') rows = parseNBA(data, espnId)
    else if (sport === 'football') rows = parseNFL(data, espnId)
    else rows = parseMLB(data, espnId)

    if (rows.length) {
      const { error: insErr } = await supabase.from(table).insert(rows)
      if (insErr) {
        console.log(`  INSERT ERROR: ${insErr.message}`)
        stats[sport].failed++
      } else {
        console.log(`  Inserted ${rows.length} rows`)
        stats[sport].fetched++
        stats[sport].inserted += rows.length
      }
    } else {
      console.log(`  No box score data from ESPN`)
      stats[sport].failed++
    }

    await delay(300) // be nice to ESPN
  }

  console.log('\n=== RESULTS ===')
  for (const [sport, s] of Object.entries(stats)) {
    console.log(`${sport}: checked=${s.checked} skipped=${s.skipped} fetched=${s.fetched} inserted=${s.inserted} failed=${s.failed}`)
  }
}

main().catch(console.error)
