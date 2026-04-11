import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

let _supabase
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wnvbncbyrhbkbburzvzy.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndudmJuY2J5cmhia2JidXJ6dnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjY1NzEsImV4cCI6MjA5MDg0MjU3MX0.xt-8x-fqxKs9KfgkuVCBaVFos0ZHZ2rKEFu4T5VABsc'
    )
  }
  return _supabase
}

// Fetch NBA box score from ESPN
async function fetchNBABoxScore(espnGameId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${espnGameId}`
  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return null
    return await res.json()
  } catch(e) { return null }
}

async function fetchNFLBoxScore(espnGameId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${espnGameId}`
  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return null
    return await res.json()
  } catch(e) { return null }
}

async function fetchMLBBoxScore(espnGameId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${espnGameId}`
  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return null
    return await res.json()
  } catch(e) { return null }
}

function parseNBAPlayers(data, espnGameId) {
  const rows = []
  const boxScore = data?.boxscore?.players || []
  for (const team of boxScore) {
    const teamAbbr = team.team?.abbreviation
    for (const statGroup of (team.statistics || [])) {
      for (const athlete of (statGroup.athletes || [])) {
        const stats = {}
        const labels = statGroup.labels || []
        const values = athlete.stats || []
        labels.forEach((label, i) => { stats[label.toLowerCase()] = values[i] })

        const fgParts = (stats.fg || '0-0').split('-')
        const tpParts = (stats['3pt'] || '0-0').split('-')
        const ftParts = (stats.ft || '0-0').split('-')
        rows.push({
          nba_game_id: espnGameId,
          player_name: athlete.athlete?.displayName,
          team_abbr: teamAbbr,
          minutes: stats.min || null,
          points: parseInt(stats.pts) || 0,
          rebounds: parseInt(stats.reb) || 0,
          assists: parseInt(stats.ast) || 0,
          steals: parseInt(stats.stl) || 0,
          blocks: parseInt(stats.blk) || 0,
          turnovers: parseInt(stats.to) || 0,
          fg_made: parseInt(fgParts[0]) || 0,
          fg_attempted: parseInt(fgParts[1]) || 0,
          tp_made: parseInt(tpParts[0]) || 0,
          tp_attempted: parseInt(tpParts[1]) || 0,
          ft_made: parseInt(ftParts[0]) || 0,
          ft_attempted: parseInt(ftParts[1]) || 0,
          plus_minus: parseInt(stats['+/-']) || 0,
        })
      }
    }
  }
  return rows
}

function parseNFLPlayers(data, espnGameId) {
  const rows = []
  const boxScore = data?.boxscore?.players || []
  for (const team of boxScore) {
    const teamAbbr = team.team?.abbreviation
    for (const statGroup of (team.statistics || [])) {
      const category = statGroup.name // passing, rushing, receiving, etc
      for (const athlete of (statGroup.athletes || [])) {
        const stats = {}
        const labels = statGroup.labels || []
        const values = athlete.stats || []
        labels.forEach((label, i) => { stats[label.toLowerCase()] = values[i] })

        const catt = (stats['c/att'] || '0/0').split('/')
        rows.push({
          espn_game_id: espnGameId,
          player_name: athlete.athlete?.displayName,
          team_abbr: teamAbbr,
          position: category,
          // Passing
          pass_completions: category === 'passing' ? parseInt(catt[0]) || 0 : null,
          pass_attempts: category === 'passing' ? parseInt(catt[1]) || 0 : null,
          pass_yards: category === 'passing' ? parseInt(stats.yds) || 0 : null,
          pass_tds: category === 'passing' ? parseInt(stats.td) || 0 : null,
          interceptions_thrown: category === 'passing' ? parseInt(stats.int) || 0 : null,
          // Rushing
          rush_attempts: category === 'rushing' ? parseInt(stats.car) || 0 : null,
          rush_yards: category === 'rushing' ? parseInt(stats.yds) || 0 : null,
          rush_tds: category === 'rushing' ? parseInt(stats.td) || 0 : null,
          // Receiving
          receptions: category === 'receiving' ? parseInt(stats.rec) || 0 : null,
          receiving_yards: category === 'receiving' ? parseInt(stats.yds) || 0 : null,
          receiving_tds: category === 'receiving' ? parseInt(stats.td) || 0 : null,
          targets: category === 'receiving' ? parseInt(stats.tgts) || 0 : null,
        })
      }
    }
  }
  return rows
}

function parseMLBPlayers(data, espnGameId) {
  const rows = []
  const boxScore = data?.boxscore?.players || []
  for (const team of boxScore) {
    const teamAbbr = team.team?.abbreviation
    for (const statGroup of (team.statistics || [])) {
      const isPitching = statGroup.name === 'pitching'
      for (const athlete of (statGroup.athletes || [])) {
        const stats = {}
        const labels = statGroup.labels || []
        const values = athlete.stats || []
        labels.forEach((label, i) => { stats[label.toLowerCase()] = values[i] })

        rows.push({
          espn_game_id: espnGameId,
          player_name: athlete.athlete?.displayName,
          team_abbr: teamAbbr,
          is_pitcher: isPitching,
          // Batting
          at_bats: !isPitching ? parseInt(stats.ab) || 0 : null,
          hits: !isPitching ? parseInt(stats.h) || 0 : null,
          runs: !isPitching ? parseInt(stats.r) || 0 : null,
          rbi: !isPitching ? parseInt(stats.rbi) || 0 : null,
          home_runs: !isPitching ? parseInt(stats.hr) || 0 : null,
          walks: !isPitching ? parseInt(stats.bb) || 0 : null,
          strikeouts: !isPitching ? parseInt(stats.so || stats.k) || 0 : null,
          // Pitching
          innings_pitched: isPitching ? stats.ip || null : null,
          earned_runs: isPitching ? parseInt(stats.er) || 0 : null,
          strikeouts_pitched: isPitching ? parseInt(stats.k || stats.so) || 0 : null,
          walks_allowed: isPitching ? parseInt(stats.bb) || 0 : null,
          hits_allowed: isPitching ? parseInt(stats.h) || 0 : null,
        })
      }
    }
  }
  return rows
}

async function processGames(sport, days = 2) {
  // Find recent games that may not have box scores yet
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  let query = getSupabase().from('games')
    .select('id,nba_game_id,sport,game_date,home_team_abbr,away_team_abbr')
    .eq('sport', sport)
    .gte('game_date', sinceStr)
    .order('game_date', { ascending: false })
    .limit(50)

  const { data: games, error } = await query
  if (error || !games?.length) return { sport, processed: 0, inserted: 0 }

  let processed = 0, inserted = 0

  for (const game of games) {
    const espnId = game.nba_game_id // We store ESPN ID here for all sports
    if (!espnId) continue

    if (sport === 'basketball') {
      // Check if box scores exist
      const { count } = await getSupabase().from('box_scores')
        .select('id', { count: 'exact', head: true })
        .eq('nba_game_id', espnId)
      if (count > 0) continue

      const data = await fetchNBABoxScore(espnId)
      if (!data) continue
      const rows = parseNBAPlayers(data, espnId)
      if (rows.length) {
        const { error: insErr } = await getSupabase().from('box_scores').insert(rows)
        if (!insErr) inserted += rows.length
        else console.error(`NBA box insert error: ${insErr.message}`)
      }
      processed++
    }

    if (sport === 'football') {
      const { count } = await getSupabase().from('nfl_box_scores')
        .select('id', { count: 'exact', head: true })
        .eq('espn_game_id', espnId)
      if (count > 0) continue

      const data = await fetchNFLBoxScore(espnId)
      if (!data) continue
      const rows = parseNFLPlayers(data, espnId)
      if (rows.length) {
        const { error: insErr } = await getSupabase().from('nfl_box_scores').insert(rows)
        if (!insErr) inserted += rows.length
        else console.error(`NFL box insert error: ${insErr.message}`)
      }
      processed++
    }

    if (sport === 'baseball') {
      const { count } = await getSupabase().from('mlb_box_scores')
        .select('id', { count: 'exact', head: true })
        .eq('espn_game_id', espnId)
      if (count > 0) continue

      const data = await fetchMLBBoxScore(espnId)
      if (!data) continue
      const rows = parseMLBPlayers(data, espnId)
      if (rows.length) {
        const { error: insErr } = await getSupabase().from('mlb_box_scores').insert(rows)
        if (!insErr) inserted += rows.length
        else console.error(`MLB box insert error: ${insErr.message}`)
      }
      processed++
    }
  }

  return { sport, processed, inserted }
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = []
    for (const sport of ['basketball', 'football', 'baseball']) {
      const result = await processGames(sport)
      results.push(result)
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), results })
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
}
