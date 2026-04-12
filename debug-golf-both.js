const DG_KEY = '696bc24a4e7aef6124332cf9810d'

async function main() {
  // Check Data Golf in-play (live tournament data)
  console.log('=== DATA GOLF: preds/in-play ===')
  const res = await fetch(`https://feeds.datagolf.com/preds/in-play?file_format=json&key=${DG_KEY}`)
  const d = await res.json()
  console.log('Keys:', Object.keys(d).join(', '))
  if (d.info) console.log('Info:', JSON.stringify(d.info).slice(0, 200))
  if (d.data && Array.isArray(d.data)) {
    console.log('Players:', d.data.length)
    if (d.data[0]) {
      console.log('Player keys:', Object.keys(d.data[0]).join(', '))
      console.log('Sample:', JSON.stringify(d.data[0]).slice(0, 400))
    }
  }

  // Try ESPN with different golf API patterns
  console.log('\n=== ESPN GOLF TESTS ===')
  const espnUrls = [
    'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard',
    'https://sports.core.api.espn.com/v2/sports/golf/leagues/pga/events?limit=10&dates=2026',
  ]
  
  for (const url of espnUrls) {
    const label = url.includes('core') ? 'core events' : 'scoreboard'
    try {
      const r = await fetch(url)
      console.log(`\n${label} -> ${r.status}`)
      if (r.ok) {
        const data = await r.json()
        if (data.events) {
          console.log('Events:', data.events.length)
          for (const e of data.events.slice(0, 3)) {
            const comp = e.competitions?.[0]
            const numPlayers = comp?.competitors?.length || 0
            console.log(`  ${e.name} (${e.id}) - ${numPlayers} competitors, status: ${e.status?.type?.name}`)
          }
        }
        if (data.items) {
          console.log('Items:', data.items.length)
          if (data.items[0]?.$ref) console.log('  First ref:', data.items[0].$ref.slice(0, 100))
        }
      }
    } catch(e) {
      console.log(`${label} -> ERROR: ${e.message}`)
    }
  }
}

main().catch(console.error)
