// Backfills context_blurbs for ALL playoff games missing them:
//   - MLB: Division Series, Wild Card
//   - NFL: all playoff rounds
//
// Run: node backfill-all-playoff-blurbs.js

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://wnvbncbyrhbkbburzvzy.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0 }
  return Math.abs(hash)
}

function pick(arr, seed) { return arr[hashCode(seed) % arr.length] }

function generateBaseballBlurb(g) {
  const away = g.away_team_abbr, home = g.home_team_abbr
  const as = g.away_score, hs = g.home_score
  const w = as > hs ? away : home, l = as > hs ? home : away
  const ws = Math.max(as, hs), ls = Math.min(as, hs)
  const margin = ws - ls
  const venue = g.venue || 'the ballpark'
  const series = g.series_info || ''
  const shutout = ls === 0, blowout = margin >= 5, close = margin <= 1
  const gnMatch = series.match(/Game (\d)/)
  const gameNum = gnMatch ? parseInt(gnMatch[1]) : 0
  const seed = String(g.id) + g.game_date

  let roundName = 'the postseason'
  if (series.includes('ALDS') || series.includes('NLDS')) roundName = series.includes('ALDS') ? 'the ALDS' : 'the NLDS'
  else if (series.includes('Wild Card')) roundName = 'the Wild Card'

  if (gameNum === 5 && series.includes('DS')) {
    return pick([
      `${w} wins the decisive Game 5 to advance, taking ${roundName} with a ${ws}-${ls} win at ${venue}. ${l}'s season ends one game short.`,
      `Game 5 goes to ${w} at ${venue}. A ${ws}-${ls} win sends ${w} to the Championship Series and ends ${l}'s run.`,
    ], seed)
  }
  if (gameNum === 3 && series.includes('Wild Card')) {
    return pick([
      `${w} wins the winner-take-all Wild Card Game 3 at ${venue}, ${ws}-${ls}. ${l}'s season is over.`,
      `${w} advances with a ${ws}-${ls} Game 3 win at ${venue}. The Wild Card round delivers drama to the end.`,
    ], seed)
  }
  if (gameNum === 1) {
    return pick([
      `${w} takes the opener ${ws}-${ls} at ${venue}. First blood in ${roundName}.`,
      `${w} grabs the early lead in ${roundName} with a ${ws}-${ls} Game 1 win at ${venue}.`,
      `${roundName} opens with ${w} topping ${l} ${ws}-${ls} at ${venue}.`,
    ], seed)
  }
  if (shutout) {
    return pick([
      `${w} pitching shuts out ${l} ${ws}-0 in ${series} at ${venue}. A dominant mound performance.`,
      `A ${ws}-0 shutout for ${w} in ${series}. ${l} can't find an answer at ${venue}.`,
    ], seed)
  }
  if (blowout) {
    return pick([
      `${w} breaks it open with a ${ws}-${ls} win in ${series} at ${venue}.`,
      `${w} rolls past ${l} ${ws}-${ls} in ${series}. The bats come alive at ${venue}.`,
    ], seed)
  }
  if (close) {
    return pick([
      `A tight ${series} goes to ${w}, edging ${l} ${ws}-${ls} at ${venue}. Every pitch matters.`,
      `${w} holds off ${l} ${ws}-${ls} in a tense ${series} at ${venue}.`,
      `${w} survives a ${ws}-${ls} nailbiter in ${series} at ${venue}.`,
    ], seed)
  }
  return pick([
    `${w} takes ${series} with a ${ws}-${ls} win over ${l} at ${venue}.`,
    `${w} beats ${l} ${ws}-${ls} in ${series} at ${venue}.`,
    `A ${ws}-${ls} ${w} victory in ${series} at ${venue}. The series continues.`,
  ], seed)
}

function generateFootballBlurb(g) {
  const away = g.away_team_abbr, home = g.home_team_abbr
  const as = g.away_score, hs = g.home_score
  const w = as > hs ? away : home, l = as > hs ? home : away
  const ws = Math.max(as, hs), ls = Math.min(as, hs)
  const margin = ws - ls
  const venue = g.venue || 'the stadium'
  const series = g.series_info || ''
  const shutout = ls === 0, blowout = margin >= 14, close = margin <= 3
  const ot = margin <= 3 // rough proxy
  const seed = String(g.id) + g.game_date

  const isSB = series.toLowerCase().includes('super bowl')
  const isConf = series.toLowerCase().includes('conference championship') || series.toLowerCase().includes('conf championship') || series.toLowerCase().includes('afc championship') || series.toLowerCase().includes('nfc championship')
  const isDiv = series.toLowerCase().includes('divisional')
  const isWC = series.toLowerCase().includes('wild card')

  if (isSB) {
    return pick([
      `${w} wins ${series} ${ws}-${ls} at ${venue}. The Lombardi Trophy goes to ${w} in a ${close ? 'hard-fought battle' : blowout ? 'dominant performance' : 'well-played game'}.`,
      `${w} takes the title with a ${ws}-${ls} victory over ${l} in ${series} at ${venue}.`,
    ], seed)
  }
  if (isConf) {
    const confName = series.includes('AFC') || series.includes('afc') ? 'AFC' : series.includes('NFC') || series.includes('nfc') ? 'NFC' : ''
    return pick([
      `${w} punches its ticket to the Super Bowl with a ${ws}-${ls} win over ${l} at ${venue}. ${confName ? confName + ' champions.' : ''}`,
      `${w} advances to the Super Bowl, beating ${l} ${ws}-${ls} in the ${confName} Championship at ${venue}.`,
      `A ${ws}-${ls} ${w} win at ${venue} sends them to the Super Bowl. ${l}'s season ends ${close ? 'in heartbreaking fashion' : 'one game short of the big stage'}.`,
    ], seed)
  }
  if (isDiv) {
    if (close) {
      return pick([
        `${w} survives a ${ws}-${ls} thriller at ${venue} in the Divisional Round. A ${margin}-point game that came down to the final minutes.`,
        `${w} edges ${l} ${ws}-${ls} in a tight Divisional Round game at ${venue}.`,
        `A ${ws}-${ls} nailbiter at ${venue} goes to ${w} in the Divisional Round.`,
      ], seed)
    }
    if (blowout) {
      return pick([
        `${w} dominates ${l} ${ws}-${ls} in the Divisional Round at ${venue}. The game is never in doubt.`,
        `${w} rolls in the Divisional Round, beating ${l} ${ws}-${ls} at ${venue}.`,
      ], seed)
    }
    return pick([
      `${w} advances with a ${ws}-${ls} Divisional Round win over ${l} at ${venue}.`,
      `${w} beats ${l} ${ws}-${ls} in the Divisional Round at ${venue}. One step closer to the conference title.`,
    ], seed)
  }
  if (isWC) {
    return pick([
      `${w} wins the Wild Card round ${ws}-${ls} over ${l} at ${venue}. The playoff journey begins.`,
      `${w} takes care of business in the Wild Card, beating ${l} ${ws}-${ls} at ${venue}.`,
      `A ${ws}-${ls} Wild Card win for ${w} at ${venue}. ${l}'s season ends in the first round.`,
    ], seed)
  }
  // Generic playoff
  if (shutout) return `${w} shuts out ${l} ${ws}-0 in ${series} at ${venue}. A defensive masterpiece.`
  if (blowout) return `${w} cruises past ${l} ${ws}-${ls} in ${series} at ${venue}.`
  if (close) return `${w} holds off ${l} ${ws}-${ls} in a tight ${series} at ${venue}.`
  return `${w} beats ${l} ${ws}-${ls} in ${series} at ${venue}.`
}

async function backfillSport(sport, filterFn, blurbFn) {
  console.log(`\n=== Fetching ${sport} playoff games ===`)
  
  const { data: games, error } = await supabase
    .from('games')
    .select('id,game_date,away_team_abbr,away_score,home_team_abbr,home_score,series_info,venue,context_blurb')
    .eq('sport', sport)
    .not('series_info', 'is', null)
    .neq('series_info', '')
    .neq('series_info', 'Regular Season')
    .order('game_date', { ascending: false })
    .limit(3000)

  if (error) { console.log('Fetch error:', error.message); return }

  const filtered = filterFn ? games.filter(filterFn) : games
  const needBlurb = filtered.filter(g => !g.context_blurb || g.context_blurb.trim() === '')
  console.log(`  Total: ${filtered.length}, Need blurbs: ${needBlurb.length}`)

  if (needBlurb.length === 0) { console.log('  All done!'); return }

  let updated = 0, errors = 0
  for (const g of needBlurb) {
    const blurb = blurbFn(g)
    const { error: updateErr } = await supabase
      .from('games')
      .update({ context_blurb: blurb })
      .eq('id', g.id)
    
    if (updateErr) { errors++; if (errors <= 3) console.log(`  Error ${g.id}: ${updateErr.message}`) }
    else { updated++ }
    if (updated % 50 === 0 && updated > 0) console.log(`  Updated ${updated}/${needBlurb.length}...`)
  }
  console.log(`  Done: ${updated} updated, ${errors} errors`)
}


function generateBasketballBlurb(g) {
  const away = g.away_team_abbr, home = g.home_team_abbr
  const as = g.away_score, hs = g.home_score
  const w = as > hs ? away : home, l = as > hs ? home : away
  const ws = Math.max(as, hs), ls = Math.min(as, hs)
  const margin = ws - ls
  const venue = g.venue || 'the arena'
  const series = g.series_info || ''
  const close = margin <= 3, blowout = margin >= 20
  const seed = String(g.id) + g.game_date

  const isFinals = series.toLowerCase().includes('finals') && !series.toLowerCase().includes('conf')
  const isConf = series.toLowerCase().includes('conf')
  const gnMatch = series.match(/Game (\d)/)
  const gameNum = gnMatch ? parseInt(gnMatch[1]) : 0

  if (isFinals && gameNum === 7) {
    return `${w} wins Game 7 of the NBA Finals ${ws}-${ls} at ${venue}. The championship is decided in the ultimate game.`
  }
  if (gameNum === 7) {
    return pick([
      `${w} takes Game 7 ${ws}-${ls} at ${venue} to advance. A winner-take-all classic.`,
      `Game 7 goes to ${w}, ${ws}-${ls} at ${venue}. ${l}'s season ends in the most dramatic way possible.`,
    ], seed)
  }
  if (close) {
    return pick([
      `${w} holds off ${l} ${ws}-${ls} in a tight ${series} at ${venue}.`,
      `A ${ws}-${ls} nailbiter in ${series} goes to ${w} at ${venue}. ${margin}-point game.`,
    ], seed)
  }
  if (blowout) {
    return pick([
      `${w} dominates ${l} ${ws}-${ls} in ${series} at ${venue}. Never in doubt.`,
      `${w} rolls past ${l} ${ws}-${ls} in ${series}. A wire-to-wire performance at ${venue}.`,
    ], seed)
  }
  return pick([
    `${w} takes ${series} ${ws}-${ls} over ${l} at ${venue}.`,
    `${w} beats ${l} ${ws}-${ls} in ${series} at ${venue}.`,
    `A ${ws}-${ls} ${w} win in ${series} at ${venue}. The series continues.`,
  ], seed)
}

async function main() {
  // MLB Division Series
  await backfillSport('baseball',
    g => g.series_info.includes('ALDS') || g.series_info.includes('NLDS'),
    generateBaseballBlurb
  )

  // MLB Wild Card
  await backfillSport('baseball',
    g => g.series_info.toLowerCase().includes('wild card'),
    generateBaseballBlurb
  )

  // MLB Championship Series (in case the earlier script missed any)
  await backfillSport('baseball',
    g => g.series_info.includes('ALCS') || g.series_info.includes('NLCS'),
    generateBaseballBlurb
  )

  // NFL - all playoff rounds
  await backfillSport('football', null, generateFootballBlurb)

  // NBA - remaining missing blurbs
  await backfillSport('basketball', null, generateBasketballBlurb)

  console.log('\n=== All done! ===')
}

main().catch(console.error)

