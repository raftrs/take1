async function main() {
  const gameId = '211031110'
  
  // Check what game this actually is
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${gameId}`)
  const d = await res.json()
  
  const h = d.header?.competitions?.[0]
  if (h) {
    console.log('Date:', h.date)
    console.log('Status:', h.status?.type?.description)
    const comps = h.competitors || []
    for (const c of comps) {
      console.log(`  ${c.team?.abbreviation}: ${c.score}`)
    }
  }

  // Try the ESPN website URL pattern
  console.log('\nESPN website URL: https://www.espn.com/mlb/boxscore/_/gameId/' + gameId)
  
  // Try a newer game we know works - check what ID format it uses
  console.log('\n--- Checking a known working game (241026124 = 2024 WS) ---')
  const res2 = await fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=241026124')
  const d2 = await res2.json()
  const bp2 = d2.boxscore?.players
  const total2 = bp2?.reduce((sum, t) => sum + (t.statistics || []).reduce((s, sg) => s + (sg.athletes?.length || 0), 0), 0)
  console.log('2024 WS athletes:', total2)
  
  const h2 = d2.header?.competitions?.[0]
  if (h2) {
    console.log('Date:', h2.date)
    for (const c of (h2.competitors || [])) {
      console.log(`  ${c.team?.abbreviation}: ${c.score}`)
    }
  }
}

main().catch(console.error)
