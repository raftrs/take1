// Run from raftrs-app directory:
//   node backfill-cs-blurbs.js

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://wnvbncbyrhbkbburzvzy.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function generateBlurb(g) {
  const away = g.away_team_abbr
  const home = g.home_team_abbr
  const as = g.away_score
  const hs = g.home_score
  const w = as > hs ? away : home
  const l = as > hs ? home : away
  const ws = Math.max(as, hs)
  const ls = Math.min(as, hs)
  const margin = ws - ls
  const venue = g.venue || 'the ballpark'
  const series = g.series_info || ''
  const isALCS = series.includes('ALCS')
  const seriesName = isALCS ? 'ALCS' : 'NLCS'
  const pennantName = isALCS ? 'American League pennant' : 'National League pennant'
  
  // Extract game number
  const gnMatch = series.match(/Game (\d)/)
  const gameNum = gnMatch ? parseInt(gnMatch[1]) : 0
  
  const shutout = ls === 0
  const blowout = margin >= 5
  const close = margin <= 1
  const extras = margin === 1 // proxy for possible extras

  // Elimination/clinch context
  const isGame7 = gameNum === 7
  const isGame6 = gameNum === 6
  const isGame5 = gameNum === 5
  const isGame1 = gameNum === 1

  // Build varied blurbs
  const templates = []

  if (isGame7) {
    templates.push(
      `${w} wins Game 7 to advance to the World Series. A winner-take-all classic at ${venue} sends ${w} to the Fall Classic.`,
      `${w} takes the ${seriesName} in seven games with a ${ws}-${ls} win at ${venue}. ${l} falls one game short of the ${pennantName}.`,
      `Game 7 goes to ${w} at ${venue}. The ${seriesName} comes down to the final game, and ${w} punches its ticket to the World Series with a ${ws}-${ls} victory.`,
    )
  } else if (isGame6 && margin <= 3) {
    templates.push(
      `${w} takes ${series} with a ${ws}-${ls} win at ${venue}. ${l} faces elimination heading into a potential Game 7.`,
      `A ${ws}-${ls} ${w} win in ${series} at ${venue}. The ${seriesName} is far from over.`,
    )
  } else if (isGame1) {
    templates.push(
      `${w} takes the ${seriesName} opener ${ws}-${ls} at ${venue}. First blood in the pennant race.`,
      `${w} grabs the early ${seriesName} lead with a ${ws}-${ls} Game 1 win at ${venue}.`,
      `The ${seriesName} opens at ${venue} with ${w} taking Game 1, ${ws}-${ls} over ${l}.`,
    )
  }

  if (shutout) {
    templates.push(
      `${w} pitching shuts out ${l} ${ws}-0 in ${series} at ${venue}. A dominant mound performance keeps ${l} off the scoreboard.`,
      `A ${ws}-0 shutout for ${w} in ${series}. ${l} can not solve ${w} pitching at ${venue}.`,
    )
  } else if (blowout) {
    templates.push(
      `${w} breaks the game open with a ${ws}-${ls} win in ${series} at ${venue}. The bats come alive in a lopsided affair.`,
      `${w} rolls past ${l} ${ws}-${ls} in ${series}. The offense erupts at ${venue} in a game that was never close.`,
    )
  } else if (close) {
    templates.push(
      `A tight ${series} goes to ${w}, edging ${l} ${ws}-${ls} at ${venue}. Every pitch matters in a one-run game.`,
      `${w} holds off ${l} ${ws}-${ls} in a tense ${series} at ${venue}. The ${seriesName} delivers another tight one.`,
      `${w} survives a ${ws}-${ls} nailbiter in ${series} at ${venue}. One run separates the two clubs.`,
    )
  } else {
    templates.push(
      `${w} takes ${series} with a ${ws}-${ls} win over ${l} at ${venue}.`,
      `${w} beats ${l} ${ws}-${ls} in ${series} at ${venue}. The ${seriesName} continues.`,
      `A ${ws}-${ls} ${w} victory in ${series} at ${venue}. ${l} will need to regroup.`,
    )
  }

  // Pick a random template
  const idx = Math.abs(hashCode(g.id + g.game_date)) % templates.length
  return templates[idx]
}

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash
}

async function backfill() {
  // Fetch all ALCS/NLCS games without blurbs
  const { data: games, error } = await supabase
    .from('games')
    .select('id,game_date,away_team_abbr,away_score,home_team_abbr,home_score,series_info,venue,context_blurb')
    .or('series_info.ilike.%ALCS%,series_info.ilike.%NLCS%')
    .eq('sport', 'baseball')
    .order('game_date', { ascending: false })
    .limit(1000)

  if (error) { console.log('Fetch error:', error.message); return }
  
  const needBlurb = games.filter(g => !g.context_blurb || g.context_blurb.trim() === '')
  console.log(`Found ${games.length} ALCS/NLCS games, ${needBlurb.length} need blurbs`)

  if (needBlurb.length === 0) { console.log('All games already have blurbs!'); return }

  let updated = 0
  for (const g of needBlurb) {
    const blurb = generateBlurb(g)
    const { error: updateErr } = await supabase
      .from('games')
      .update({ context_blurb: blurb })
      .eq('id', g.id)
    
    if (updateErr) {
      console.log(`Error updating ${g.id}: ${updateErr.message}`)
    } else {
      updated++
      if (updated % 25 === 0) console.log(`  Updated ${updated}/${needBlurb.length}...`)
    }
  }
  
  console.log(`Done! Updated ${updated} games.`)
}

backfill().catch(console.error)
