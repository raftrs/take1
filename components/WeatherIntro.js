'use client'
import { useState, useEffect } from 'react'

const DOMES = [
  'Mercedes-Benz Stadium', 'Georgia Dome',
  'Caesars Superdome', 'Mercedes-Benz Superdome', 'Louisiana Superdome',
  'Lucas Oil Stadium', 'RCA Dome',
  'NRG Stadium', 'Reliant Stadium', 'Reliant Astrodome', 'Astrodome',
  'AT&T Stadium', 'Texas Stadium',
  'Allegiant Stadium',
  'U.S. Bank Stadium', 'Metrodome', 'Hubert H. Humphrey Metrodome',
  'SoFi Stadium', // open-air canopy but feels enclosed - actually NOT a dome, remove
  'State Farm Stadium', 'University of Phoenix Stadium',
  'Ford Field', 'Pontiac Silverdome', 'Silverdome',
  'Edward Jones Dome', 'Trans World Dome',
  'Kingdome',
  'Carrier Dome',
]
// Remove SoFi - it's open air with a canopy
const DOME_SET = new Set(DOMES.filter(d => d !== 'SoFi Stadium'))

function isDome(venue) {
  if (!venue) return false
  return DOME_SET.has(venue)
}

export default function WeatherIntro({ weather, sport, venue }) {
  const [visible, setVisible] = useState(false)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    if (!weather) return
    // Only animate for outdoor football and golf
    if (sport === 'basketball') return
    if (sport === 'football' && isDome(venue)) return

    const condition = sport === 'golf'
      ? (Array.isArray(weather) ? weather[weather.length - 1]?.condition : weather?.condition)
      : weather?.condition

    if (!condition) return
    const c = condition.toLowerCase()
    if (c === 'snow' || c === 'rain' || c === 'drizzle' || c === 'thunderstorm') {
      setVisible(true)
      // Fade out after 2.5s
      setTimeout(() => setOpacity(0), 2500)
      setTimeout(() => setVisible(false), 3200)
    }
  }, [weather, sport, venue])

  if (!visible || !weather) return null

  const condition = sport === 'golf'
    ? (Array.isArray(weather) ? weather[weather.length - 1]?.condition : weather?.condition)
    : weather?.condition
  const c = (condition || '').toLowerCase()
  const isSnow = c === 'snow'

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none', zIndex: 100,
      opacity: opacity, transition: 'opacity 0.7s ease-out',
      overflow: 'hidden',
    }}>
      {isSnow ? (
        // Snowflakes
        <div style={{ position: 'absolute', inset: 0 }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}px`,
              width: `${3 + Math.random() * 5}px`,
              height: `${3 + Math.random() * 5}px`,
              background: 'rgba(255,255,255,0.8)',
              borderRadius: '50%',
              animation: `snowfall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s infinite`,
              filter: `blur(${Math.random() > 0.5 ? 1 : 0}px)`,
            }} />
          ))}
          <style>{`
            @keyframes snowfall {
              0% { transform: translateY(-10px) translateX(0); opacity: 1; }
              50% { transform: translateY(50vh) translateX(${Math.random() > 0.5 ? '' : '-'}20px); opacity: 0.8; }
              100% { transform: translateY(100vh) translateX(${Math.random() > 0.5 ? '' : '-'}40px); opacity: 0; }
            }
          `}</style>
        </div>
      ) : (
        // Rain streaks
        <div style={{ position: 'absolute', inset: 0 }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `-${10 + Math.random() * 30}px`,
              width: '1.5px',
              height: `${15 + Math.random() * 20}px`,
              background: 'rgba(160,152,136,0.4)',
              transform: 'rotate(12deg)',
              animation: `rainfall ${0.4 + Math.random() * 0.4}s linear ${Math.random() * 0.5}s infinite`,
            }} />
          ))}
          <style>{`
            @keyframes rainfall {
              0% { transform: translateY(-30px) rotate(12deg); opacity: 0.6; }
              100% { transform: translateY(100vh) rotate(12deg); opacity: 0; }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}
