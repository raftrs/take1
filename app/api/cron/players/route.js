import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

let _supabase
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return _supabase
}

async function updateNBAPlayerStats() {
  // Aggregate career stats from box_scores
  const { data: stats, error } = await getSupabase().rpc('aggregate_nba_career_stats')

  if (error) {
    console.error('NBA stats aggregation error:', error.message)
    // Fallback: do it manually with a query
    const { data, error: qErr } = await supabase
      .from('box_scores')
      .select('player_name,points,rebounds,assists,steals,blocks')

    if (qErr) return { sport: 'basketball', updated: 0, error: qErr.message }

    // Group by player
    const players = {}
    for (const row of (data || [])) {
      if (!row.player_name) continue
      if (!players[row.player_name]) {
        players[row.player_name] = { gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 }
      }
      const p = players[row.player_name]
      p.gp++
      p.pts += (parseInt(row.points) || 0)
      p.reb += (parseInt(row.rebounds) || 0)
      p.ast += (parseInt(row.assists) || 0)
      p.stl += (parseInt(row.steals) || 0)
      p.blk += (parseInt(row.blocks) || 0)
    }

    // This would be too slow for 230k rows in a serverless function
    // Better approach: use Supabase SQL function
    return { sport: 'basketball', updated: 0, note: 'Use SQL function instead' }
  }

  return { sport: 'basketball', updated: stats?.length || 0 }
}

async function updateNFLPlayerStats() {
  // Update games_played from nfl_box_scores
  const { error } = await getSupabase().rpc('aggregate_nfl_career_stats')
  if (error) return { sport: 'football', updated: 0, error: error.message }
  return { sport: 'football', updated: 'via rpc' }
}

async function updateMLBPlayerStats() {
  const { error } = await getSupabase().rpc('aggregate_mlb_career_stats')
  if (error) return { sport: 'baseball', updated: 0, error: error.message }
  return { sport: 'baseball', updated: 'via rpc' }
}

async function syncNewPlayers() {
  // Insert any players from box scores that are not in players table yet
  let inserted = 0

  // NBA
  const { data: newNba } = await getSupabase().rpc('find_new_nba_players')
  if (newNba?.length) {
    for (const p of newNba) {
      const { error } = await getSupabase().from('players').insert({
        player_name: p.player_name,
        sport: 'basketball',
        active: true
      })
      if (!error) inserted++
    }
  }

  // NFL
  const { data: newNfl } = await getSupabase().rpc('find_new_nfl_players')
  if (newNfl?.length) {
    for (const p of newNfl) {
      const { error } = await getSupabase().from('players').insert({
        player_name: p.player_name,
        sport: 'football',
        active: true
      })
      if (!error) inserted++
    }
  }

  // MLB
  const { data: newMlb } = await getSupabase().rpc('find_new_mlb_players')
  if (newMlb?.length) {
    for (const p of newMlb) {
      const { error } = await getSupabase().from('players').insert({
        player_name: p.player_name,
        sport: 'baseball',
        position: p.is_pitcher ? 'P' : 'Position',
        active: true
      })
      if (!error) inserted++
    }
  }

  return { newPlayers: inserted }
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = {
    timestamp: new Date().toISOString(),
    newPlayers: await syncNewPlayers(),
    nba: await updateNBAPlayerStats(),
    nfl: await updateNFLPlayerStats(),
    mlb: await updateMLBPlayerStats(),
  }

  console.log('[players]', JSON.stringify(results))
  return NextResponse.json({ success: true, ...results })
}
