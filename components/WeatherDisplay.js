'use client'

function formatWeather(w) {
  if (!w) return null
  const parts = []
  if (w.high != null) parts.push(`${w.high}°F`)
  if (w.condition && w.condition !== 'Clear' && w.condition !== 'Cloudy') parts.push(w.condition)
  if (w.wind_mph && w.wind_mph >= 10) parts.push(`${w.wind_mph} mph wind`)
  return parts.join(', ')
}

export default function WeatherDisplay({ weather, sport }) {
  if (!weather) return null

  // Golf: show all 4 rounds
  if (sport === 'golf' && Array.isArray(weather)) {
    return (
      <div style={{ marginTop: 10, marginBottom: 4 }}>
        <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--faint)', borderBottom: '1px solid var(--faint)' }}>
          {weather.map((d, i) => (
            <div key={i} style={{ flex: 1, padding: '8px 4px', textAlign: 'center', borderRight: i < weather.length - 1 ? '1px solid var(--faint)' : 'none' }}>
              <div className="sans" style={{ fontSize: 8, color: 'var(--dim)', letterSpacing: 1, fontWeight: 600, marginBottom: 3 }}>
                {['THU', 'FRI', 'SAT', 'SUN'][i] || `R${i + 1}`}
              </div>
              <div className="sans" style={{ fontSize: 12, color: 'var(--ink)' }}>{d.high != null ? `${d.high}°` : ''}</div>
              <div className="sans" style={{ fontSize: 9, color: 'var(--dim)', marginTop: 1 }}>
                {d.wind_mph ? `${d.wind_mph}mph` : ''}
              </div>
              {d.condition && d.condition !== 'Clear' && d.condition !== 'Cloudy' && (
                <div className="sans" style={{ fontSize: 8, color: 'var(--copper)', marginTop: 1 }}>{d.condition}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Non-golf: single line
  const line = formatWeather(weather)
  if (!line) return null

  return (
    <div className="sans" style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="1.5">
        <path d="M12 3v1m0 16v1m-9-9h1m16 0h1m-2.636-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707"/>
        <circle cx="12" cy="12" r="4"/>
      </svg>
      <span>{line}</span>
    </div>
  )
}
