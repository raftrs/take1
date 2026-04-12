const { createClient } = require('@supabase/supabase-js')

async function main() {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=211031110')
  const data = await res.json()
  
  const players = data.boxscore.players
  console.log('Teams:', players.length)
  
  for (const team of players) {
    console.log('\nTeam:', team.team.abbreviation)
    console.log('Stat groups:', team.statistics.length)
    
    for (const sg of team.statistics) {
      console.log('  name:', sg.name, 'type:', sg.type)
      console.log('  labels:', sg.labels?.join(', '))
      console.log('  athletes:', sg.athletes?.length)
      
      if (sg.athletes?.[0]) {
        const a = sg.athletes[0]
        console.log('  first athlete:', a.athlete?.displayName)
        console.log('  stats:', a.stats?.join(', '))
      }
    }
  }
}

main().catch(console.error)
