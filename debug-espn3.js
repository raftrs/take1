async function main() {
  const gameId = '211031110' // Brosius Does It Again - 2001 WS
  
  const urls = [
    `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${gameId}`,
    `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/boxscore?event=${gameId}`,
    `https://site.web.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${gameId}`,
    `https://sports.core.api.espn.com/v2/sports/baseball/leagues/mlb/events/${gameId}/competitions/${gameId}/competitors`,
    `https://cdn.espn.com/core/mlb/boxscore?xhr=1&gameId=${gameId}`,
  ]

  for (const url of urls) {
    console.log('\n--- Trying:', url.split('?')[0].split('/').slice(-2).join('/'))
    try {
      const res = await fetch(url)
      console.log('Status:', res.status)
      if (!res.ok) continue
      const d = await res.json()
      
      // Check for player data in various locations
      const bp = d?.boxscore?.players
      if (bp) {
        const total = bp.reduce((sum, t) => {
          return sum + (t.statistics || []).reduce((s2, sg) => s2 + (sg.athletes?.length || 0), 0)
        }, 0)
        console.log('boxscore.players athletes:', total)
      }
      
      if (d?.players) console.log('d.players:', typeof d.players, Array.isArray(d.players) ? d.players.length : '')
      if (d?.gamepackageJSON) {
        const gp = d.gamepackageJSON
        if (gp.boxscore?.players) {
          const total = gp.boxscore.players.reduce((sum, t) => {
            return sum + (t.statistics || []).reduce((s2, sg) => s2 + (sg.athletes?.length || 0), 0)
          }, 0)
          console.log('gamepackageJSON.boxscore.players athletes:', total)
        }
      }
      
      console.log('Top keys:', Object.keys(d).slice(0, 10).join(', '))
    } catch(e) {
      console.log('Error:', e.message)
    }
  }
}

main().catch(console.error)
