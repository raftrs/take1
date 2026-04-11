import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

let _supabase
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return _supabase
}

// ESPN scoreboard endpoints
const SPORTS = [
  {
    key: 'basketball',
    espnPath: 'basketball/nba',
    dbSport: 'basketball',
    getSeriesInfo: (comp) => {
      const notes = comp.notes?.[0]?.headline || ''
      return notes || (comp.series?.summary || '') || null
    }
  },
  {
    key: 'football',
    espnPath: 'football/nfl',
    dbSport: 'football',
    getSeriesInfo: (comp) => {
      const notes = comp.notes?.[0]?.headline || ''
      const type = comp.notes?.[0]?.type || ''
      if (type === 'event' || notes) return notes || null
      return null
    }
  },
  {
    key: 'baseball',
    espnPath: 'baseball/mlb',
    dbSport: 'baseball',
    getSeriesInfo: (comp) => {
      const notes = comp.notes?.[0]?.headline || ''
      return notes || null
    }
  }
]

function getDateStr(daysAgo = 1) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0].replace(/-/g, '')
}

function toGameDate(dateStr) {
  // ESPN dates are UTC, convert to YYYY-MM-DD
  try {
    const d = new Date(dateStr)
    return d.toISOString().split('T')[0]
  } catch { return null }
}

async function fetchESPN(sport, dateStr) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sport.espnPath}/scoreboard?dates=${dateStr}`
  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return []
    const data = await res.json()
    return data.events || []
  } catch (e) {
    console.error(`ESPN fetch error for ${sport.key}: ${e.message}`)
    return []
  }
}

function parseGame(event, sport) {
  const comp = event.competitions?.[0]
  if (!comp) return null

  // Skip if game not completed
  const status = comp.status?.type?.name
  if (status !== 'STATUS_FINAL') return null

  const competitors = comp.competitors || []
  const home = competitors.find(c => c.homeAway === 'home')
  const away = competitors.find(c => c.homeAway === 'away')
  if (!home || !away) return null

  const venue = comp.venue
  const seriesInfo = sport.getSeriesInfo(comp)

  // Determine week for NFL regular season
  let week = null
  if (sport.key === 'football') {
    const seasonType = event.season?.type
    const weekNum = event.week?.number
    if (seasonType === 2 && weekNum) week = `Week ${weekNum}`
    else if (seasonType === 3) week = seriesInfo || 'Playoffs'
  }

  return {
    espn_game_id: event.id,
    game_date: toGameDate(comp.date || event.date),
    home_team_abbr: home.team?.abbreviation,
    away_team_abbr: away.team?.abbreviation,
    home_score: parseInt(home.score) || 0,
    away_score: parseInt(away.score) || 0,
    sport: sport.dbSport,
    venue: venue?.fullName || null,
    venue_city: venue?.address ? `${venue.address.city}, ${venue.address.state}` : null,
    series_info: sport.key === 'football' ? (seriesInfo || week || 'Regular Season') : (seriesInfo || 'Regular Season'),
    title: null,
    // Store ESPN ID for box score fetching later
    nba_game_id: sport.key === 'basketball' ? event.id : null,
  }
}

async function syncScores(sport, dateStr) {
  const events = await fetchESPN(sport, dateStr)
  if (!events.length) return { sport: sport.key, date: dateStr, found: 0, inserted: 0, skipped: 0 }

  const games = events.map(e => parseGame(e, sport)).filter(Boolean)
  let inserted = 0, skipped = 0

  for (const game of games) {
    // Check if game already exists (by date + teams)
    const { data: existing } = await supabase
      .from('games')
      .select('id')
      .eq('game_date', game.game_date)
      .eq('home_team_abbr', game.home_team_abbr)
      .eq('away_team_abbr', game.away_team_abbr)
      .eq('sport', game.sport)
      .limit(1)

    if (existing?.length) {
      // Update score if it changed (game might have been inserted before final)
      await supabase
        .from('games')
        .update({ home_score: game.home_score, away_score: game.away_score })
        .eq('id', existing[0].id)
      skipped++
      continue
    }

    const { error } = await getSupabase().from('games').insert(game)
    if (error) {
      console.error(`Insert error: ${error.message}`, game)
    } else {
      inserted++
    }
  }

  return { sport: sport.key, date: dateStr, found: games.length, inserted, skipped }
}

export async function GET(request) {
  // Verify cron secret in production
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = []

  // Fetch yesterday and today (covers timezone gaps)
  for (const daysAgo of [0, 1]) {
    const dateStr = getDateStr(daysAgo)
    for (const sport of SPORTS) {
      const result = await syncScores(sport, dateStr)
      results.push(result)
      console.log(`[scores] ${result.sport} ${result.date}: ${result.found} found, ${result.inserted} new, ${result.skipped} existing`)
    }
  }

  const totalInserted = results.reduce((a, r) => a + r.inserted, 0)
  const totalFound = results.reduce((a, r) => a + r.found, 0)

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    totalFound,
    totalInserted,
    results
  })
}
