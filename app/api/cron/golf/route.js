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

// Fetch current/recent PGA events from ESPN scoreboard
async function fetchGolfScoreboard() {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard'
  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return null
    return await res.json()
  } catch(e) { return null }
}

// Fetch leaderboard for a specific event
async function fetchLeaderboard(eventId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard?event=${eventId}`
  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return null
    return await res.json()
  } catch(e) { return null }
}

function parseLeaderboard(data, eventId, gameId) {
  const rows = []
  const competitors = data?.events?.[0]?.competitions?.[0]?.competitors || []
  
  for (const player of competitors) {
    const name = player.athlete?.displayName
    if (!name) continue
    
    const pos = player.status?.position?.id ? parseInt(player.status.position.id) : (parseInt(player.sortOrder) || null)
    const totalScore = player.score?.displayValue || player.statistics?.[0]?.displayValue || null
    const espnPlayerId = player.athlete?.id || null
    
    // Parse round scores from linescores
    const rounds = player.linescores || []
    const r1 = rounds[0]?.displayValue || rounds[0]?.value || null
    const r2 = rounds[1]?.displayValue || rounds[1]?.value || null
    const r3 = rounds[2]?.displayValue || rounds[2]?.value || null
    const r4 = rounds[3]?.displayValue || rounds[3]?.value || null
    const roundsPlayed = rounds.filter(r => r.displayValue || r.value).length

    rows.push({
      espn_event_id: eventId,
      game_id: gameId,
      player_name: name,
      espn_player_id: espnPlayerId,
      position: pos,
      total_score: totalScore,
      round_1: r1 ? String(r1) : null,
      round_2: r2 ? String(r2) : null,
      round_3: r3 ? String(r3) : null,
      round_4: r4 ? String(r4) : null,
      rounds_played: roundsPlayed || null,
      sport: 'golf',
      league: 'pga',
    })
  }
  return rows
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sb = getSupabase()
    const results = { tournaments: 0, newTournaments: 0, leaderboardRows: 0, errors: [] }

    // Get ESPN scoreboard (shows current/recent events)
    const scoreboard = await fetchGolfScoreboard()
    if (!scoreboard) {
      return NextResponse.json({ success: false, error: 'Could not fetch ESPN golf scoreboard' })
    }

    const events = scoreboard.events || []
    results.tournaments = events.length

    for (const event of events) {
      const eventId = event.id
      const status = event.status?.type?.name || ''
      const isComplete = status === 'STATUS_FINAL' || event.status?.type?.completed === true
      if (!isComplete) continue

      const comp = event.competitions?.[0]
      const title = event.name || event.shortName || 'PGA Tour Event'
      const endDate = comp?.endDate || event.date
      const gameDate = endDate ? new Date(endDate).toISOString().split('T')[0] : null
      if (!gameDate) continue

      const venue = comp?.venue
      const venueName = venue?.fullName || null
      const venueCity = venue?.address ? `${venue.address.city || ''}, ${venue.address.state || ''}`.replace(/^, |, $/g, '') : null

      // Check if tournament exists in games table
      const { data: existing } = await sb.from('games')
        .select('id').eq('nba_game_id', eventId).eq('sport', 'golf').limit(1)

      let gameId
      if (existing?.length) {
        gameId = existing[0].id
      } else {
        // Insert new tournament
        const { data: inserted, error: insErr } = await sb.from('games').insert({
          title,
          game_date: gameDate,
          sport: 'golf',
          venue: venueName,
          venue_city: venueCity,
          nba_game_id: eventId,
          series_info: 'PGA Tour',
        }).select('id').single()

        if (insErr) { results.errors.push(`Insert game: ${insErr.message}`); continue }
        gameId = inserted.id
        results.newTournaments++
      }

      // Check if leaderboard already exists
      const { count } = await sb.from('golf_leaderboard')
        .select('id', { count: 'exact', head: true })
        .eq('espn_event_id', eventId)

      if (count > 0) continue // Already have leaderboard

      // Fetch and insert leaderboard
      const lbData = await fetchLeaderboard(eventId)
      if (!lbData) { results.errors.push(`Leaderboard fetch failed for ${eventId}`); continue }

      const rows = parseLeaderboard(lbData, eventId, gameId)
      if (rows.length > 0) {
        // Insert in batches of 50
        for (let i = 0; i < rows.length; i += 50) {
          const batch = rows.slice(i, i + 50)
          const { error: lbErr } = await sb.from('golf_leaderboard').insert(batch)
          if (lbErr) results.errors.push(`LB insert: ${lbErr.message}`)
          else results.leaderboardRows += batch.length
        }
      }
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), results })
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
}
