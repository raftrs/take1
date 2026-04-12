const DG_KEY = '696bc24a4e7aef6124332cf9810d'

async function main() {
  // Get 2026 PGA Tour events
  const res = await fetch(`https://feeds.datagolf.com/historical-raw-data/event-list?file_format=json&key=${DG_KEY}`)
  const events = await res.json()
  const pga2026 = events.filter(e => e.calendar_year === 2026 && e.tour === 'pga')
  console.log(`2026 PGA Tour events: ${pga2026.length}`)
  pga2026.forEach(e => console.log(`  ${e.event_name} (id: ${e.event_id}) - ${e.date}`))

  // Try to get round data for the most recent completed event
  const testEvent = pga2026[0] // Most recent
  console.log(`\nTesting rounds for: ${testEvent.event_name} (${testEvent.event_id})`)

  const urls = [
    `https://feeds.datagolf.com/historical-raw-data/rounds?tour=pga&event_id=${testEvent.event_id}&year=2026&file_format=json&key=${DG_KEY}`,
    `https://feeds.datagolf.com/historical-raw-data/rounds?event_id=${testEvent.event_id}&year=2026&file_format=json&key=${DG_KEY}`,
  ]

  for (const url of urls) {
    const label = url.split('datagolf.com/')[1]?.split('&key')[0]
    try {
      const r = await fetch(url)
      console.log(`\n${label} -> ${r.status}`)
      if (r.ok) {
        const d = await r.json()
        if (Array.isArray(d)) {
          console.log(`  ${d.length} rows`)
          if (d[0]) {
            console.log('  Keys:', Object.keys(d[0]).join(', '))
            console.log('  Sample:', JSON.stringify(d[0]).slice(0, 300))
          }
        } else {
          console.log('  Keys:', Object.keys(d).join(', '))
          console.log('  Sample:', JSON.stringify(d).slice(0, 300))
        }
      }
    } catch(e) {
      console.log(`  Error: ${e.message}`)
    }
  }
}

main().catch(console.error)
