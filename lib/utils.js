export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function sportLabel(sport) {
  return { basketball: 'NBA', football: 'NFL', golf: 'Golf', baseball: 'MLB' }[sport] || ''
}

export function sportColor(sport) {
  return { basketball: '#E56020', football: '#013369', golf: '#006747', baseball: '#CE1141' }[sport] || '#a09888'
}

export function capType(type) {
  if (!type) return ''
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function sortPerformers(performers, winnerAbbr) {
  if (!performers?.length) return []
  const winners = performers.filter(p => p.team_abbr === winnerAbbr)
  const losers = performers.filter(p => p.team_abbr !== winnerAbbr)
  const result = []
  const maxLen = Math.max(winners.length, losers.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < winners.length) result.push(winners[i])
    if (i < losers.length) result.push(losers[i])
  }
  return result
}

export function getWinner(homeAbbr, awayAbbr, homeScore, awayScore) {
  if (!homeScore || !awayScore) return homeAbbr
  return homeScore > awayScore ? homeAbbr : awayAbbr
}

// Display score only for non-golf, avoiding React 0 render
export function showScore(g) {
  if (!g) return null
  if (g.sport === 'golf') return null
  if (g.home_score == null && g.away_score == null) return null
  return `${g.away_team_abbr} ${g.away_score} / ${g.home_score} ${g.home_team_abbr}`
}

// Winner-emphasized score: returns { away: { abbr, score, won }, home: { abbr, score, won } }
export function scoreWithWinner(g) {
  if (!g || g.sport === 'golf') return null
  if (g.home_score == null && g.away_score == null) return null
  const aw = Number(g.away_score), hw = Number(g.home_score)
  return {
    away: { abbr: g.away_team_abbr, score: g.away_score, won: aw > hw },
    home: { abbr: g.home_team_abbr, score: g.home_score, won: hw > aw },
  }
}

// City normalization - suburb to primary city
export const CITY_MAP = {
  'East Rutherford, NJ': 'New York',
  'Inglewood, CA': 'Los Angeles',
  'Landover, MD': 'Washington',
  'Orchard Park, NY': 'Buffalo',
  'Paradise, NV': 'Las Vegas',
  'Foxborough, MA': 'Boston',
  'Arlington, TX': 'Dallas',
  'Glendale, AZ': 'Phoenix',
  'Santa Clara, CA': 'San Francisco',
  'Bloomfield Hills, MI': 'Detroit',
  'Oakmont, PA': 'Pittsburgh',
  'Springfield, NJ': 'New York',
  'Mamaroneck, NY': 'New York',
  'Southampton, NY': 'New York',
  'Newtown Square, PA': 'Philadelphia',
  'Havertown, PA': 'Philadelphia',
  'Olympia Fields, IL': 'Chicago',
  'Medinah, IL': 'Chicago',
  'Chaska, MN': 'Minneapolis',
  'Cherry Hills Village, CO': 'Denver',
  'Bethesda, MD': 'Washington',
  'Duluth, GA': 'Atlanta',
  'Pacific Palisades, CA': 'Los Angeles',
  'Sammamish, WA': 'Seattle',
  'Kildeer, IL': 'Chicago',
  'Carmel, IN': 'Indianapolis',
  'Lake Buena Vista, FL': 'Orlando',
  'Elmont, NY': 'New York',
  'Louisville, KY': 'Louisville',
  'Clemmons, NC': 'Charlotte',
  'Akron, OH': 'Cleveland',
  'Beachwood, OH': 'Cleveland',
  'Ligonier, PA': 'Pittsburgh',
  'Columbine Valley, CO': 'Denver',
  'Shoal Creek, AL': 'Birmingham',
  'Edmond, OK': 'Oklahoma City',
  'Canton, MA': 'Boston',
  'Palm Beach Gardens, FL': 'Miami',
  'Rochester, NY': 'Rochester',
  'Toledo, OH': 'Toledo',
  // State/region team market names -> actual cities
  'Arizona': 'Phoenix',
  'Minnesota': 'Minneapolis',
  'Tennessee': 'Nashville',
  'Indiana': 'Indianapolis',
  'Golden State': 'San Francisco',
  'Carolina': 'Charlotte',
  'New England': 'Boston',
  'Utah': 'Salt Lake City',
}

export function normalizeCity(city) {
  if (!city) return null
  return CITY_MAP[city] || city.split(',')[0].trim()
}

// Golf major abbreviation to full name
const GOLF_MAJOR_NAMES = {
  'MAS': 'Masters', 'USO': 'U.S. Open', 'OPN': 'The Open', 'PGA': 'PGA Championship',
  'Masters': 'Masters', 'U.S. Open': 'U.S. Open', 'The Open': 'The Open', 'PGA Championship': 'PGA Championship',
}
export function golfMajorDisplay(game) {
  if (game?.sport !== 'golf') return null
  const year = game.game_date?.split('-')[0] || game.season_year
  const name = GOLF_MAJOR_NAMES[game.home_team_abbr] || GOLF_MAJOR_NAMES[game.away_team_abbr] || game.title?.replace(/^\d{4}\s+/, '')
  if (!name) return null
  return `${year} ${name}`
}

// Playoff detection - a game is playoff if series_info exists and isn't regular season
export function isPlayoff(seriesInfo) {
  if (!seriesInfo) return false
  const s = seriesInfo.toLowerCase().trim()
  if (s === '' || s === 'regular' || s === 'regular season') return false
  if (s.startsWith('week ')) return false
  if (s === 'preseason' || s.startsWith('preseason')) return false
  return true
}

// Playlist for prev/next navigation on game/notable pages
export function savePlaylist(items, currentIndex) {
  try {
    sessionStorage.setItem('playlist', JSON.stringify(items))
    sessionStorage.setItem('playlist-idx', currentIndex.toString())
  } catch(e) {}
}

export function getPlaylist() {
  try {
    const items = JSON.parse(sessionStorage.getItem('playlist') || '[]')
    return items
  } catch(e) { return [] }
}
