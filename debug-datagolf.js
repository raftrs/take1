const DG_KEY = '696bc24a4e7aef6124332cf9810d'

async function main() {
  // Test various Data Golf API endpoints
  const urls = [
    `https://feeds.datagolf.com/historical-raw-data/event-list?file_format=json&key=${DG_KEY}`,
    `https://feeds.datagolf.com/preds/get-dg-rankings?file_format=json&key=${DG_KEY}`,
    `https://feeds.datagolf.com/field-updates?file_format=json&key=${DG_KEY}`,
    `https://feeds.datagolf.com/preds/pre-tournament?file_format=json&key=${DG_KEY}`,
  ]

  for (const url of urls) {
    const label = url.split('datagolf.com/')[1]?.split('?')[0]
    try {
      const res = await fetch(url)
      console.log(`\n${label} -> ${res.status}`)
      if (res.ok) {
        const d = await res.json()
        if (Array.isArray(d)) {
          console.log(`  Array with ${d.length} items`)
          if (d[0]) console.log('  First item keys:', Object.keys(d[0]).join(', '))
          // Show most recent events
          if (d[0]?.calendar_year) {
            const recent = d.filter(e => e.calendar_year >= 2026).slice(0, 5)
            recent.forEach(e => console.log(`  ${e.calendar_year} ${e.event_name} (${e.event_id})`))
          }
        } else {
          console.log('  Keys:', Object.keys(d).join(', '))
          if (d.current_season) console.log('  Current season:', d.current_season)
        }
      }
    } catch(e) {
      console.log(`${label} -> ERROR: ${e.message}`)
    }
  }
}

main().catch(console.error)
