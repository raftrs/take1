const DG_KEY = '696bc24a4e7aef6124332cf9810d'

async function main() {
  const endpoints = [
    'preds/pre-tournament',
    'preds/pre-tournament-archive',
    'preds/in-play',
    'preds/get-dg-rankings',
    'field-updates',
    'historical-raw-data/event-list',
    'historical-raw-data/rounds',
    'historical-raw-data/strokes',
    'live-model-predictions/live-tournament-stats',
    'live-model-predictions/live-hole-stats',
    'general/models',
    'general/schedule',
  ]

  for (const ep of endpoints) {
    try {
      const url = `https://feeds.datagolf.com/${ep}?file_format=json&key=${DG_KEY}`
      const res = await fetch(url)
      const status = res.status
      let info = ''
      if (res.ok) {
        const d = await res.json()
        if (Array.isArray(d)) info = `${d.length} items`
        else info = Object.keys(d).slice(0, 5).join(', ')
      }
      console.log(`${status} ${ep} ${info}`)
    } catch(e) {
      console.log(`ERR ${ep} ${e.message}`)
    }
  }
}

main().catch(console.error)
