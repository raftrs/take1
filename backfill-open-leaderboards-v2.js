require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://wnvbncbyrhbkbburzvzy.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const OPENS = [
  { year: 2022, espnId: '401353217', gameId: 25388 },
  { year: 2023, espnId: '401465539', gameId: 25519 },
  { year: 2024, espnId: '401580360', gameId: 25634 },
]

async function fetchCompetitors(espnId) {
  const url = `https://sports.core.api.espn.com/v2/sports/golf/leagues/pga/events/${espnId}/competitions/${espnId}/competitors?limit=200`
  console.log(`  Fetching competitors...`)
  const res = await fetch(url)
  if (!res.ok) { console.log(`  HTTP ${res.status}`); return [] }
  const data = await res.json()
  const items = data?.items || []
  
  if (items.length > 0 && items[0].$ref) {
    console.log(`  Got ${items.length} refs, fetching each...`)
    const players = []
    for (let i = 0; i < items.length; i++) {
      try {
        const r = await fetch(items[i].$ref)
        if (r.ok) players.push(await r.json())
        if ((i+1) % 20 === 0) process.stdout.write(`  ${i+1}/${items.length}\n`)
      } catch(e) { /* skip */ }
    }
    // Log first player structure for debugging
    if (players[0]) {
      const keys = Object.keys(players[0])
      console.log(`  Player keys: ${keys.join(', ')}`)
      if (players[0].linescores) console.log(`  linescores type: ${typeof players[0].linescores}`)
      if (players[0].score) console.log(`  score: ${JSON.stringify(players[0].score).slice(0,100)}`)
    }
    return players
  }
  
  return items
}

async function resolveRef(obj) {
  if (!obj) return null
  if (obj.$ref) {
    try { const r = await fetch(obj.$ref); return r.ok ? await r.json() : null }
    catch(e) { return null }
  }
  return obj
}

async function parsePlayer(c) {
  // Athlete might be a $ref
  let athlete = c.athlete
  if (athlete?.$ref) athlete = await resolveRef(athlete)
  const name = athlete?.displayName || c.athlete?.displayName || 'Unknown'
  
  // Position
  const pos = c.status?.position?.displayName || ''
  
  // Linescores might be a $ref, array, or object with items
  let rounds = []
  if (Array.isArray(c.linescores)) {
    rounds = c.linescores
  } else if (c.linescores?.$ref) {
    const lsData = await resolveRef(c.linescores)
    rounds = lsData?.items || []
  } else if (c.linescores?.items) {
    rounds = c.linescores.items
  }
  
  // Resolve round $refs if needed
  const resolvedRounds = []
  for (const r of rounds) {
    if (r.$ref) {
      const resolved = await resolveRef(r)
      if (resolved) resolvedRounds.push(resolved)
    } else {
      resolvedRounds.push(r)
    }
  }
  
  let total = 0
  for (const r of resolvedRounds) { if (r.value) total += r.value }
  
  return {
    player_name: name,
    position: pos.replace('T', '').replace('-', '').trim() || null,
    round_1: resolvedRounds[0]?.value ?? null,
    round_2: resolvedRounds[1]?.value ?? null,
    round_3: resolvedRounds[2]?.value ?? null,
    round_4: resolvedRounds[3]?.value ?? null,
    total_score: total || null,
  }
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

    const competitors = await fetchCompetitors(open.espnId)
    if (!competitors.length) { console.log('  No competitors found'); continue }

    console.log(`  Parsing ${competitors.length} players...`)
    const players = []
    for (let i = 0; i < competitors.length; i++) {
      const p = await parsePlayer(competitors[i])
      if (p.player_name !== 'Unknown') players.push(p)
      if ((i+1) % 20 === 0) process.stdout.write(`  Parsed ${i+1}/${competitors.length}\n`)
    }
    console.log(`  Parsed ${players.length} players total`)

    if (count > 0) {
      await supabase.from('golf_leaderboard').delete().eq('game_id', open.gameId)
    }

    const rows = players.map(p => ({ ...p, game_id: open.gameId }))
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50)
      const { error } = await supabase.from('golf_leaderboard').insert(batch)
      if (error) console.log(`  Insert error: ${error.message}`)
      else console.log(`  Inserted ${batch.length} rows`)
    }
    console.log(`  Done!`)
  }
  console.log('\nAll done!')
}

backfill().catch(console.error)
