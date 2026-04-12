async function main() {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=211031110')
  const d = await res.json()
  
  // Check rosters
  if (d.rosters) {
    console.log('=== ROSTERS ===')
    console.log('type:', typeof d.rosters, Array.isArray(d.rosters))
    if (Array.isArray(d.rosters)) {
      console.log('length:', d.rosters.length)
      if (d.rosters[0]) {
        console.log('keys:', Object.keys(d.rosters[0]).join(', '))
        if (d.rosters[0].roster) {
          console.log('roster length:', d.rosters[0].roster.length)
          if (d.rosters[0].roster[0]) {
            console.log('player keys:', Object.keys(d.rosters[0].roster[0]).join(', '))
            console.log('first player:', JSON.stringify(d.rosters[0].roster[0]).slice(0, 300))
          }
        }
      }
    }
  }

  // Check atBats
  if (d.atBats) {
    console.log('\n=== AT BATS ===')
    console.log('type:', typeof d.atBats, Array.isArray(d.atBats))
    if (Array.isArray(d.atBats)) {
      console.log('length:', d.atBats.length)
      if (d.atBats[0]) {
        console.log('keys:', Object.keys(d.atBats[0]).join(', '))
        console.log('first:', JSON.stringify(d.atBats[0]).slice(0, 300))
      }
    }
  }

  // Check plays
  if (d.plays) {
    console.log('\n=== PLAYS ===')
    console.log('length:', d.plays.length)
    if (d.plays[0]) {
      console.log('keys:', Object.keys(d.plays[0]).join(', '))
    }
  }

  // Check header for player stats
  if (d.header) {
    console.log('\n=== HEADER ===')
    const comps = d.header.competitions?.[0]?.competitors
    if (comps) {
      console.log('competitors:', comps.length)
      if (comps[0]?.leaders) {
        console.log('leaders:', JSON.stringify(comps[0].leaders).slice(0, 400))
      }
      if (comps[0]?.statistics) {
        console.log('statistics:', JSON.stringify(comps[0].statistics).slice(0, 400))
      }
    }
  }
}

main().catch(console.error)
