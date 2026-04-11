import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wnvbncbyrhbkbburzvzy.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndudmJuY2J5cmhia2JidXJ6dnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjY1NzEsImV4cCI6MjA5MDg0MjU3MX0.xt-8x-fqxKs9KfgkuVCBaVFos0ZHZ2rKEFu4T5VABsc'
  )
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sb = getSupabase()
    const results = []

    // Get yesterday and today
    for (const daysAgo of [0, 1]) {
      const d = new Date()
      d.setDate(d.getDate() - daysAgo)
      const dateStr = d.toISOString().split('T')[0].replace(/-/g, '')

      for (const sport of [
        { key: 'basketball', path: 'basketball/nba' },
        { key: 'football', path: 'football/nfl' },
        { key: 'baseball', path: 'baseball/mlb' },
      ]) {
        try {
          const url = `https://site.api.espn.com/apis/site/v2/sports/${sport.path}/scoreboard?dates=${dateStr}`
          const res = await fetch(url)
          if (!res.ok) { results.push({ sport: sport.key, date: dateStr, error: `ESPN HTTP ${res.status}` }); continue }
          const data = await res.json()
          const events = data.events || []

          let inserted = 0, skipped = 0

          for (const event of events) {
            const comp = event.competitions?.[0]
            if (!comp) continue
            if (comp.status?.type?.name !== 'STATUS_FINAL') continue

            const competitors = comp.competitors || []
            const home = competitors.find(c => c.homeAway === 'home')
            const away = competitors.find(c => c.homeAway === 'away')
            if (!home || !away) continue

            const gameDate = new Date(comp.date || event.date).toISOString().split('T')[0]
            const homeAbbr = home.team?.abbreviation
            const awayAbbr = away.team?.abbreviation
            const homeScore = parseInt(home.score) || 0
            const awayScore = parseInt(away.score) || 0
            const venue = comp.venue
            const notes = comp.notes?.[0]?.headline || ''
            
            let seriesInfo = notes || 'Regular Season'
            if (sport.key === 'football' && !notes) {
              const weekNum = event.week?.number
              const seasonType = event.season?.type
              seriesInfo = seasonType === 2 && weekNum ? `Week ${weekNum}` : (seasonType === 3 ? 'Playoffs' : 'Regular Season')
            }

            // Check if exists
            const { data: existing } = await sb.from('games').select('id').eq('game_date', gameDate).eq('home_team_abbr', homeAbbr).eq('away_team_abbr', awayAbbr).eq('sport', sport.key).limit(1)

            if (existing?.length) {
              await sb.from('games').update({ home_score: homeScore, away_score: awayScore }).eq('id', existing[0].id)
              skipped++
            } else {
              const { error } = await sb.from('games').insert({
                game_date: gameDate,
                home_team_abbr: homeAbbr,
                away_team_abbr: awayAbbr,
                home_score: homeScore,
                away_score: awayScore,
                sport: sport.key,
                venue: venue?.fullName || null,
                venue_city: venue?.address ? `${venue.address.city}, ${venue.address.state}` : null,
                series_info: seriesInfo,
                nba_game_id: event.id,
              })
              if (error) results.push({ sport: sport.key, insertError: error.message })
              else inserted++
            }
          }

          results.push({ sport: sport.key, date: dateStr, found: events.length, finals: inserted + skipped, inserted, skipped })
        } catch (sportErr) {
          results.push({ sport: sport.key, date: dateStr, error: sportErr.message })
        }
      }
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), results })
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
}
