fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=211031110')
  .then(r => r.json())
  .then(d => {
    const sg = d.boxscore.players[0].statistics[0]
    console.log('keys:', Object.keys(sg).join(', '))
    console.log('type:', sg.type)
    console.log('name:', sg.name)
    console.log('has athletes:', !!sg.athletes)
    console.log('has labels:', !!sg.labels)
    if (sg.athletes && sg.athletes[0]) {
      console.log('athlete keys:', Object.keys(sg.athletes[0]).join(', '))
    }
    if (!sg.athletes) {
      console.log(JSON.stringify(sg).slice(0, 800))
    }
  })
