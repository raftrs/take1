export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function sportLabel(sport) {
  return { basketball: 'NBA', football: 'NFL', golf: 'Golf' }[sport] || ''
}

export function sportColor(sport) {
  return { basketball: '#E56020', football: '#013369', golf: '#006747' }[sport] || '#a09888'
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
}

export function normalizeCity(city) {
  if (!city) return null
  return CITY_MAP[city] || city.split(',')[0].trim()
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
