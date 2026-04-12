#!/usr/bin/env node
// Backfill 2026 PGA Tour schedule from ESPN
// Run: cd ~/Downloads/raftrs-app && node backfill-golf-2026.js

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
  'https://wnvbncbyrhbkbburzvzy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndudmJuY2J5cmhia2JidXJ6dnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjY1NzEsImV4cCI6MjA5MDg0MjU3MX0.xt-8x-fqxKs9KfgkuVCBaVFos0ZHZ2rKEFu4T5VABsc'
)

const delay = ms => new Promise(r => setTimeout(r, ms))

async function fetchSchedule(year) {
  // ESPN uses season year for golf schedule
  const url = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?dates=${year}`
  console.log(`Fetching schedule for ${year}...`)
  try {
    const res = await fetch(url)
    if (!res.ok) { console.log(`  HTTP ${res.status}`); return null }
    return await res.json()
  } catch(e) { console.log(`  Error: ${e.message}`); return null }
}

async function fetchLeaderboard(eventId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard?event=${eventId}`
  try {
    const res = await fetch(url)
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

// Filter out non-PGA Tour events
function isPGATour(name) {
  const lower = (name || '').toLowerCase()
  if (lower.includes('korn ferry')) return false
  if (lower.includes('champions tour')) return false
  if (lower.includes('senior')) return false
  if (lower.includes('q-school')) return false
  if (lower.includes('legends')) return false
  if (lower.includes('dp world')) return false
  if (lower.includes('lpga')) return false
  return true
}

async function main() {
  const stats = { found: 0, skipped: 0, inserted: 0, leaderboards: 0, lbRows: 0, errors: 0 }
  
  // Fetch 2026 schedule
  const data = await fetchSchedule(2026)
  if (!data) { console.log('Failed to fetch schedule'); return }
  
  const events = data.events || []
  console.log(`Found ${events.length} events for 2026\n`)
  
  for (const event of events) {
    const eventId = event.id
    const title = event.name || event.shortName || 'Unknown'
    const status = event.status?.type?.name || ''
    const isComplete = status === 'STATUS_FINAL' || event.status?.type?.completed === true
    
    if (!isPGATour(title)) {
      console.log(`  SKIP (not PGA Tour): ${title}`)
      continue
    }
    
    stats.found++
    
    const comp = event.competitions?.[0]
    const endDate = comp?.endDate || comp?.startDate || event.date
    const gameDate = endDate ? new Date(endDate).toISOString().split('T')[0] : null
    const venue = comp?.venue
    const venueName = venue?.fullName || null
    const venueCity = venue?.address ? `${venue.address.city || ''}, ${venue.address.state || ''}`.replace(/^, |, $/g, '') : null
    
    // Check if exists
    const { data: existing } = await supabase.from('games')
      .select('id').eq('nba_game_id', eventId).eq('sport', 'golf').limit(1)
    
    let gameId
    if (existing?.length) {
      gameId = existing[0].id
      stats.skipped++
      
      // Even if tournament exists, check if we need leaderboard
      if (isComplete) {
        const { count } = await supabase.from('golf_leaderboard')
          .select('id', { count: 'exact', head: true })
          .eq('espn_event_id', eventId)
        
        if (count === 0) {
          console.log(`[LEADERBOARD] ${title} (exists, pulling leaderboard)`)
          const lbData = await fetchLeaderboard(eventId)
          if (lbData) {
            const rows = parseLeaderboard(lbData, eventId, gameId)
            if (rows.length > 0) {
              for (let i = 0; i < rows.length; i += 50) {
                const batch = rows.slice(i, i + 50)
                const { error } = await supabase.from('golf_leaderboard').insert(batch)
                if (error) { console.log(`  LB error: ${error.message}`); stats.errors++ }
                else stats.lbRows += batch.length
              }
              stats.leaderboards++
              console.log(`  Inserted ${rows.length} leaderboard rows`)
            }
          }
          await delay(300)
        }
      }
      continue
    }
    
    // Insert new tournament
    console.log(`[NEW] ${title} - ${gameDate || 'TBD'} ${isComplete ? '(FINAL)' : '(upcoming)'}`)
    const { data: inserted, error: insErr } = await supabase.from('games').insert({
      title,
      game_date: gameDate,
      sport: 'golf',
      venue: venueName,
      venue_city: venueCity,
      nba_game_id: eventId,
      series_info: 'PGA Tour',
    }).select('id').single()
    
    if (insErr) { console.log(`  Insert error: ${insErr.message}`); stats.errors++; continue }
    gameId = inserted.id
    stats.inserted++
    
    // Pull leaderboard if complete
    if (isComplete) {
      console.log(`  Fetching leaderboard...`)
      const lbData = await fetchLeaderboard(eventId)
      if (lbData) {
        const rows = parseLeaderboard(lbData, eventId, gameId)
        if (rows.length > 0) {
          for (let i = 0; i < rows.length; i += 50) {
            const batch = rows.slice(i, i + 50)
            const { error } = await supabase.from('golf_leaderboard').insert(batch)
            if (error) { console.log(`  LB error: ${error.message}`); stats.errors++ }
            else stats.lbRows += batch.length
          }
          stats.leaderboards++
          console.log(`  Inserted ${rows.length} leaderboard rows`)
        } else {
          console.log(`  No leaderboard data from ESPN`)
        }
      }
      await delay(300)
    }
    
    await delay(200)
  }
  
  console.log('\n=== RESULTS ===')
  console.log(`PGA Tour events found: ${stats.found}`)
  console.log(`Already existed: ${stats.skipped}`)
  console.log(`New tournaments inserted: ${stats.inserted}`)
  console.log(`Leaderboards pulled: ${stats.leaderboards} (${stats.lbRows} total rows)`)
  console.log(`Errors: ${stats.errors}`)
}

main().catch(console.error)
