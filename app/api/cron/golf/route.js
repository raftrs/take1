import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const DG_KEY = '696bc24a4e7aef6124332cf9810d'

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

// Fetch live tournament data from Data Golf
async function fetchDGInPlay() {
  try {
    const res = await fetch(`https://feeds.datagolf.com/preds/in-play?file_format=json&key=${DG_KEY}`)
    if (!res.ok) return null
    return await res.json()
  } catch(e) { return null }
}

// Fetch ESPN scoreboard to match event IDs
async function fetchESPNScoreboard() {
  try {
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard')
    if (!res.ok) return null
    return await res.json()
  } catch(e) { return null }
}

// Normalize player name from "Last, First" to "First Last"
function normalizeName(dgName) {
  if (!dgName) return null
  if (!dgName.includes(',')) return dgName
  const parts = dgName.split(',').map(s => s.trim())
  return `${parts[1]} ${parts[0]}`
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sb = getSupabase()
    const results = { event: null, status: null, players: 0, action: null }

    // Get Data Golf in-play data
    const dg = await fetchDGInPlay()
    if (!dg || !dg.data?.length) {
      return NextResponse.json({ success: true, message: 'No active tournament from Data Golf', timestamp: new Date().toISOString() })
    }

    const eventName = dg.info?.event_name
    const currentRound = dg.info?.current_round
    const players = dg.data || []
    results.event = eventName
    results.status = `Round ${currentRound}`
    results.players = players.length

    // Find matching game in our DB via ESPN scoreboard
    const espn = await fetchESPNScoreboard()
    const espnEvent = espn?.events?.[0]
    const espnId = espnEvent?.id
    const isComplete = espnEvent?.status?.type?.completed === true || espnEvent?.status?.type?.name === 'STATUS_FINAL'

    if (!espnId) {
      return NextResponse.json({ success: true, message: 'Could not match ESPN event', event: eventName, timestamp: new Date().toISOString() })
    }

    // Find or create game
    const { data: existing } = await sb.from('games')
      .select('id').eq('nba_game_id', espnId).eq('sport', 'golf').limit(1)

    let gameId
    if (existing?.length) {
      gameId = existing[0].id
    } else {
      const venue = espnEvent.competitions?.[0]?.venue
      const endDate = espnEvent.competitions?.[0]?.endDate || espnEvent.date
      const gameDate = endDate ? new Date(endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      const { data: inserted, error } = await sb.from('games').insert({
        title: eventName,
        game_date: gameDate,
        sport: 'golf',
        venue: venue?.fullName || null,
        venue_city: venue?.address ? `${venue.address.city || ''}, ${venue.address.state || ''}`.replace(/^, |, $/g, '') : null,
        nba_game_id: espnId,
        series_info: 'PGA Tour',
      }).select('id').single()
      if (error) return NextResponse.json({ success: false, error: error.message })
      gameId = inserted.id
      results.action = 'created_game'
    }

    // Only write leaderboard data when tournament is complete
    // (avoids partial data and duplicate rows during the tournament)
    if (isComplete) {
      // Check if we already have leaderboard
      const { count } = await sb.from('golf_leaderboard')
        .select('id', { count: 'exact', head: true })
        .eq('espn_event_id', espnId)

      if (count > 0) {
        results.action = 'leaderboard_exists'
      } else {
        // Build leaderboard rows from Data Golf
        const rows = players.map(p => ({
          espn_event_id: espnId,
          game_id: gameId,
          player_name: normalizeName(p.player_name),
          position: p.current_pos ? parseInt(String(p.current_pos).replace('T', '')) || null : null,
          total_score: p.current_score != null ? String(p.current_score) : null,
          round_1: (p.R1 != null && !isNaN(parseInt(p.R1))) ? parseInt(p.R1) : null,
          round_2: (p.R2 != null && !isNaN(parseInt(p.R2))) ? parseInt(p.R2) : null,
          round_3: (p.R3 != null && !isNaN(parseInt(p.R3))) ? parseInt(p.R3) : null,
          round_4: (p.R4 != null && !isNaN(parseInt(p.R4))) ? parseInt(p.R4) : null,
          rounds_played: [p.R1, p.R2, p.R3, p.R4].filter(r => r != null && !isNaN(parseInt(r))).length,
          sport: 'golf',
          league: 'pga',
        })).filter(r => r.player_name)

        // Insert in batches
        let inserted = 0
        for (let i = 0; i < rows.length; i += 50) {
          const batch = rows.slice(i, i + 50)
          const { error } = await sb.from('golf_leaderboard').insert(batch)
          if (!error) inserted += batch.length
        }
        results.action = `inserted_leaderboard_${inserted}_rows`
      }
    } else {
      results.action = 'tournament_in_progress'
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), results })
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
}
