// Run from your raftrs-app directory:
//   node backfill-open-leaderboards.js
//
// Make sure NEXT_PUBLIC_SUPABASE_ANON_KEY is in your .env.local

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://wnvbncbyrhbkbburzvzy.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const OPENS = [
  { year: 2022, espnId: '401353217', gameId: 25388 },
  { year: 2023, espnId: '401465539', gameId: 25519 },
  { year: 2024, espnId: '401580338', gameId: 25634 },
  { year: 2025, espnId: '401687012', gameId: 25755 },
]

async function fetchLeaderboard(espnId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard?event=${espnId}`
  console.log(`Fetching ${url}`)
  const res = await fetch(url)
  if (!res.ok) { console.log(`  HTTP ${res.status}`); return null }
  return await res.json()
}

function parseLeaderboard(data) {
  const players = []
  const competitors = data?.events?.[0]?.competitions?.[0]?.competitors || []
  for (const c of competitors) {
    const name = c.athlete?.displayName || 'Unknown'
    const pos = c.status?.position?.displayName || String(c.sortOrder || '')
    const rounds = c.linescores || []
    players.push({
      player_name: name,
      position: pos.replace('T', '').trim() || null,
      round_1: rounds[0]?.value ?? null,
      round_2: rounds[1]?.value ?? null,
      round_3: rounds[2]?.value ?? null,
      round_4: rounds[3]?.value ?? null,
      total_score: parseInt(c.statistics?.find(s => s.name === 'totalStrokes')?.value || c.score?.displayValue) || null,
      to_par: parseInt(c.score?.value) || null,
    })
  }
  return players
}

async function backfill() {
  for (const open of OPENS) {
    console.log(`\n=== ${open.year} The Open (game_id: ${open.gameId}) ===`)

    const { count } = await supabase.from('golf_leaderboard')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', open.gameId)

    if (count > 5) {
      console.log(`  Already has ${count} rows, skipping`)
      continue
    }

    const data = await fetchLeaderboard(open.espnId)
    if (!data) continue

    const players = parseLeaderboard(data)
    console.log(`  Found ${players.length} players`)
    if (!players.length) continue

    if (count > 0) {
      await supabase.from('golf_leaderboard').delete().eq('game_id', open.gameId)
    }

    const rows = players.map(p => ({ ...p, game_id: open.gameId }))
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50)
      const { error } = await supabase.from('golf_leaderboard').insert(batch)
      if (error) console.log(`  Error: ${error.message}`)
      else console.log(`  Inserted ${batch.length} rows`)
    }
  }

  // Clean up duplicate U.S. Open games with 0 leaderboard data
  console.log('\n=== Removing duplicate U.S. Open entries ===')
  for (const id of [25374, 25504, 25620, 25744]) {
    const { error } = await supabase.from('games').delete().eq('id', id)
    if (error) console.log(`  Error deleting ${id}: ${error.message}`)
    else console.log(`  Deleted game ${id}`)
  }

  console.log('\nDone!')
}

backfill().catch(console.error)
