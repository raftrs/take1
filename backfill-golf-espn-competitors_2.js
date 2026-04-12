#!/usr/bin/env node
// Backfill 2026 golf leaderboards from ESPN scoreboard competitors
// Run: cd ~/Downloads/raftrs-app && node backfill-golf-espn-competitors.js

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
  'https://wnvbncbyrhbkbburzvzy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndudmJuY2J5cmhia2JidXJ6dnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjY1NzEsImV4cCI6MjA5MDg0MjU3MX0.xt-8x-fqxKs9KfgkuVCBaVFos0ZHZ2rKEFu4T5VABsc'
)

const delay = ms => new Promise(r => setTimeout(r, ms))

async function fetchESPNEvent(eventId) {
  // The scoreboard endpoint with event filter
  const url = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?event=${eventId}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch(e) { return null }
}

function parseESPNCompetitors(data, eventId, gameId) {
  const rows = []
  const event = data?.events?.[0]
  if (!event) return rows

  const competitors = event.competitions?.[0]?.competitors || []
  for (const c of competitors) {
    const name = c.athlete?.displayName
    if (!name) continue

    const pos = c.status?.position?.id ? parseInt(c.status.position.id) : null
    const score = c.score?.displayValue || c.statistics?.[0]?.displayValue || null
    const pos = c.status?.position?.id ? parseInt(c.status.position.id) : null
    const score = c.score?.displayValue || c.statistics?.[0]?.displayValue || null
    const espnPlayerId = c.athlete?.id ? String(c.athlete.id) : null

    const rounds = c.linescores || []
    const parseRound = (r) => { if (!r) return null; const v = parseInt(r.displayValue || r.value); return isNaN(v) ? null : v }
    const r1 = parseRound(rounds[0])
    const r2 = parseRound(rounds[1])
    const r3 = parseRound(rounds[2])
    const r4 = parseRound(rounds[3])
    const roundsPlayed = [r1,r2,r3,r4].filter(r => r != null).length

    rows.push({
      espn_event_id: eventId,
      game_id: gameId,
      player_name: name,
      espn_player_id: espnPlayerId,
      position: (pos && !isNaN(pos)) ? pos : null,
      total_score: score ? String(score) : null,
      round_1: r1,
      round_2: r2,
      round_3: r3,
      round_4: r4,
      rounds_played: roundsPlayed || null,
      sport: 'golf',
      league: 'pga',
    })
  }
  return rows
}

async function main() {
  const today = new Date().toISOString().split('T')[0]

  // Get all 2026 golf games that need leaderboards
  const { data: games } = await supabase
    .from('games')
    .select('id, title, game_date, nba_game_id')
    .eq('sport', 'golf')
    .gte('game_date', '2026-01-01')
    .lte('game_date', today)
    .not('nba_game_id', 'is', null)
    .order('game_date', { ascending: false })

  console.log(`Found ${games?.length || 0} 2026 golf games up to today\n`)
  if (!games?.length) return

  const stats = { checked: 0, hasData: 0, fetched: 0, inserted: 0, noData: 0 }

  for (const g of games) {
    stats.checked++
    const eventId = g.nba_game_id

    // Check if leaderboard exists
    const { count } = await supabase.from('golf_leaderboard')
      .select('id', { count: 'exact', head: true })
      .eq('espn_event_id', eventId)

    if (count > 0) {
      stats.hasData++
      continue
    }

    console.log(`[FETCH] ${g.title} (${g.game_date}) ESPN: ${eventId}`)
    const data = await fetchESPNEvent(eventId)

    if (!data?.events?.length) {
      console.log('  No ESPN data')
      stats.noData++
      await delay(400)
      continue
    }

    const rows = parseESPNCompetitors(data, eventId, g.id)
    if (rows.length === 0) {
      console.log('  No competitors')
      stats.noData++
      await delay(400)
      continue
    }

    // Debug: show first row
    console.log('  First row:', JSON.stringify(rows[0]))

    // Insert in batches
    let batchInserted = 0
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50)
      const { error } = await supabase.from('golf_leaderboard').insert(batch)
      if (error) console.log(`  Insert error: ${error.message}`)
      else batchInserted += batch.length
    }

    console.log(`  Inserted ${batchInserted} players`)
    stats.fetched++
    stats.inserted += batchInserted
    await delay(400)
  }

  console.log('\n=== RESULTS ===')
  console.log(`Checked: ${stats.checked}`)
  console.log(`Already had data: ${stats.hasData}`)
  console.log(`New leaderboards: ${stats.fetched} (${stats.inserted} rows)`)
  console.log(`No data from ESPN: ${stats.noData}`)
}

main().catch(console.error)
